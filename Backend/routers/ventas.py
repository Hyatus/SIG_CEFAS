from fastapi import APIRouter, HTTPException, Query
from database import execute_query, get_connection
from schemas import VentaCreate

router = APIRouter(prefix="/api/ventas", tags=["Ventas"])


@router.post("", status_code=201)
def registrar_venta(venta: VentaCreate):
    with get_connection() as conn:
        try:
            with conn.cursor() as cur:
                total = 0.0
                items_validados: list[dict] = []

                for item in venta.items:
                    cur.execute("""
                        SELECT id, nombre, precio_venta, stock_actual
                        FROM productos WHERE id = %s AND activo = TRUE
                    """, (item.producto_id,))
                    producto = cur.fetchone()

                    if not producto:
                        raise HTTPException(
                            status_code=404,
                            detail=f"Producto ID {item.producto_id} no encontrado",
                        )
                    if producto["stock_actual"] < item.cantidad:
                        raise HTTPException(
                            status_code=400,
                            detail=(
                                f"Stock insuficiente para '{producto['nombre']}'. "
                                f"Disponible: {producto['stock_actual']}, "
                                f"Solicitado: {item.cantidad}"
                            ),
                        )

                    subtotal = float(producto["precio_venta"]) * item.cantidad
                    total += subtotal
                    items_validados.append({
                        "producto_id": item.producto_id,
                        "nombre": producto["nombre"],
                        "cantidad": item.cantidad,
                        "precio_unitario": float(producto["precio_venta"]),
                        "subtotal": subtotal,
                    })

                if venta.monto_recibido < total:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Pago insuficiente. Total: Q{total:.2f}, Recibido: Q{venta.monto_recibido:.2f}",
                    )

                cambio = round(venta.monto_recibido - total, 2)

                cur.execute("""
                    INSERT INTO ventas (usuario_id, total, monto_recibido, cambio, estado)
                    VALUES (%s, %s, %s, %s, 'completada') RETURNING id
                """, (venta.usuario_id, total, venta.monto_recibido, cambio))
                venta_id = cur.fetchone()["id"]

                for item in items_validados:
                    cur.execute("""
                        INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario)
                        VALUES (%s, %s, %s, %s)
                    """, (venta_id, item["producto_id"], item["cantidad"], item["precio_unitario"]))

                conn.commit()
                return {
                    "id": venta_id,
                    "total": total,
                    "monto_recibido": venta.monto_recibido,
                    "cambio": cambio,
                    "items": items_validados,
                    "message": "Venta registrada exitosamente",
                }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.get("")
def listar_ventas(
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
):
    return execute_query("""
        SELECT v.id, v.usuario_id, u.nombre AS cajero, v.fecha,
               v.total, v.monto_recibido, v.cambio, v.estado
        FROM ventas v
        JOIN usuarios u ON u.id = v.usuario_id
        ORDER BY v.fecha DESC
        LIMIT %s OFFSET %s
    """, (limit, offset))


@router.get("/{venta_id}")
def obtener_venta(venta_id: int):
    venta = execute_query("""
        SELECT v.*, u.nombre AS cajero
        FROM ventas v JOIN usuarios u ON u.id = v.usuario_id
        WHERE v.id = %s
    """, (venta_id,))
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    detalle = execute_query("""
        SELECT vd.*, p.nombre AS producto_nombre
        FROM venta_detalle vd
        JOIN productos p ON p.id = vd.producto_id
        WHERE vd.venta_id = %s
    """, (venta_id,))

    result = dict(venta[0])
    result["detalle"] = [dict(d) for d in detalle]
    return result
