import logging
from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, Query
from database import execute_query, get_connection
from schemas import LoteCreate

router = APIRouter(prefix="/api/lotes", tags=["Lotes de Producción"])
logger = logging.getLogger("lotes")


@router.post("", status_code=201)
def registrar_lote(lote: LoteCreate):
    with get_connection() as conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, nombre FROM productos WHERE id = %s AND activo = TRUE",
                    (lote.producto_id,),
                )
                producto = cur.fetchone()
                if not producto:
                    raise HTTPException(status_code=404, detail="Producto no encontrado")

                cur.execute("""
                    INSERT INTO lotes_produccion
                        (producto_id, fecha_produccion, fecha_vencimiento, cantidad_inicial, cantidad_disponible)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    lote.producto_id,
                    lote.fecha_produccion,
                    lote.fecha_vencimiento,
                    lote.cantidad,
                    lote.cantidad,
                ))
                lote_id = cur.fetchone()["id"]

                cur.execute(
                    "UPDATE productos SET stock_actual = stock_actual + %s WHERE id = %s",
                    (lote.cantidad, lote.producto_id),
                )

                conn.commit()
                logger.info(
                    "Lote %s creado: producto_id=%s cantidad=%s vence=%s",
                    lote_id, lote.producto_id, lote.cantidad, lote.fecha_vencimiento,
                )
                return {
                    "id": lote_id,
                    "producto": producto["nombre"],
                    "cantidad": lote.cantidad,
                    "fecha_produccion": lote.fecha_produccion,
                    "fecha_vencimiento": lote.fecha_vencimiento,
                }
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Error al registrar lote")
            raise HTTPException(status_code=500, detail=str(e))


@router.get("/proximos-a-vencer")
def proximos_a_vencer(dias: int = Query(default=3, ge=1, le=30)):
    limite = date.today() + timedelta(days=dias)
    return execute_query("""
        SELECT
            l.id,
            p.id  AS producto_id,
            p.nombre AS producto_nombre,
            l.fecha_vencimiento::text,
            (l.fecha_vencimiento - CURRENT_DATE) AS dias_restantes,
            l.cantidad_disponible
        FROM lotes_produccion l
        JOIN productos p ON p.id = l.producto_id
        WHERE l.estado = 'activo'
          AND l.cantidad_disponible > 0
          AND l.fecha_vencimiento <= %s
        ORDER BY l.fecha_vencimiento ASC, l.cantidad_disponible DESC
    """, (limite,))


@router.get("")
def listar_lotes(
    producto_id: int = Query(default=None),
    estado: str = Query(default=None),
):
    query = """
        SELECT
            l.id, l.producto_id,
            p.nombre AS producto_nombre,
            l.fecha_produccion::text,
            l.fecha_vencimiento::text,
            l.cantidad_inicial, l.cantidad_disponible,
            l.estado, l.created_at
        FROM lotes_produccion l
        JOIN productos p ON p.id = l.producto_id
        WHERE 1=1
    """
    params: list = []
    if producto_id:
        query += " AND l.producto_id = %s"
        params.append(producto_id)
    if estado:
        query += " AND l.estado = %s"
        params.append(estado)
    query += " ORDER BY l.fecha_vencimiento ASC, l.id ASC"
    return execute_query(query, tuple(params) if params else None)


@router.post("/{lote_id}/dar-de-baja")
def dar_de_baja(lote_id: int):
    with get_connection() as conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM lotes_produccion WHERE id = %s",
                    (lote_id,),
                )
                lote = cur.fetchone()
                if not lote:
                    raise HTTPException(status_code=404, detail="Lote no encontrado")
                if lote["estado"] != "activo":
                    raise HTTPException(
                        status_code=400,
                        detail=f"El lote ya está en estado '{lote['estado']}'",
                    )

                cantidad_a_descartar = lote["cantidad_disponible"]
                cur.execute("""
                    UPDATE lotes_produccion
                    SET estado = 'dado_de_baja', cantidad_disponible = 0
                    WHERE id = %s
                """, (lote_id,))
                cur.execute("""
                    UPDATE productos
                    SET stock_actual = GREATEST(stock_actual - %s, 0)
                    WHERE id = %s
                """, (cantidad_a_descartar, lote["producto_id"]))

                conn.commit()
                logger.info(
                    "Lote %s dado de baja: producto_id=%s cantidad_descartada=%s",
                    lote_id, lote["producto_id"], cantidad_a_descartar,
                )
                return {
                    "message": "Lote dado de baja correctamente",
                    "cantidad_descartada": cantidad_a_descartar,
                }
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Error al dar de baja lote")
            raise HTTPException(status_code=500, detail=str(e))
