from fastapi import APIRouter, HTTPException
from database import execute_query, get_connection
from schemas import RecetaCreate, RecetaUpdate
from typing import Optional

router = APIRouter(prefix="/api/recetas", tags=["Recetas"])


@router.get("")
def listar_recetas(
    categoria_id: Optional[int] = None,
    activa: Optional[bool] = True,
):
    query = """
        SELECT r.id, r.nombre, r.categoria_id, c.nombre AS categoria_nombre,
               r.descripcion, r.rendimiento_unidades, r.activa, r.created_at,
               COALESCE(SUM(rd.cantidad * ins.costo_unitario), 0) AS costo_total
        FROM recetas r
        JOIN categorias c ON c.id = r.categoria_id
        LEFT JOIN receta_detalle rd ON rd.receta_id = r.id
        LEFT JOIN insumos ins ON ins.id = rd.insumo_id
        WHERE 1=1
    """
    params: list = []
    if categoria_id is not None:
        query += " AND r.categoria_id = %s"
        params.append(categoria_id)
    if activa is not None:
        query += " AND r.activa = %s"
        params.append(activa)
    query += " GROUP BY r.id, c.nombre ORDER BY r.nombre"
    return execute_query(query, tuple(params) if params else None)


@router.get("/{receta_id}")
def obtener_receta(receta_id: int):
    receta = execute_query("""
        SELECT r.*, c.nombre AS categoria_nombre
        FROM recetas r
        JOIN categorias c ON c.id = r.categoria_id
        WHERE r.id = %s
    """, (receta_id,))
    if not receta:
        raise HTTPException(status_code=404, detail="Receta no encontrada")

    ingredientes = execute_query("""
        SELECT rd.id, rd.insumo_id, ins.nombre AS insumo_nombre,
               rd.cantidad, um.abreviatura AS unidad,
               ins.costo_unitario,
               ROUND(rd.cantidad * ins.costo_unitario, 2) AS costo_ingrediente
        FROM receta_detalle rd
        JOIN insumos ins ON ins.id = rd.insumo_id
        JOIN unidades_medida um ON um.id = ins.unidad_medida_id
        WHERE rd.receta_id = %s
        ORDER BY ins.nombre
    """, (receta_id,))

    result = dict(receta[0])
    result["ingredientes"] = [dict(i) for i in ingredientes]
    result["costo_total"] = sum(float(i["costo_ingrediente"]) for i in ingredientes)
    return result


@router.post("", status_code=201)
def crear_receta(receta: RecetaCreate):
    with get_connection() as conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO recetas (nombre, categoria_id, descripcion, rendimiento_unidades)
                    VALUES (%s, %s, %s, %s) RETURNING id
                """, (receta.nombre, receta.categoria_id, receta.descripcion, receta.rendimiento_unidades))
                receta_id = cur.fetchone()["id"]

                for ing in receta.ingredientes:
                    cur.execute("""
                        INSERT INTO receta_detalle (receta_id, insumo_id, cantidad)
                        VALUES (%s, %s, %s)
                    """, (receta_id, ing.insumo_id, ing.cantidad))

                conn.commit()
                return {"id": receta_id, "message": "Receta creada exitosamente"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))


@router.put("/{receta_id}")
def actualizar_receta(receta_id: int, receta: RecetaUpdate):
    with get_connection() as conn:
        try:
            with conn.cursor() as cur:
                campos: list[str] = []
                valores: list = []

                if receta.nombre is not None:
                    campos.append("nombre = %s"); valores.append(receta.nombre)
                if receta.categoria_id is not None:
                    campos.append("categoria_id = %s"); valores.append(receta.categoria_id)
                if receta.descripcion is not None:
                    campos.append("descripcion = %s"); valores.append(receta.descripcion)
                if receta.rendimiento_unidades is not None:
                    campos.append("rendimiento_unidades = %s"); valores.append(receta.rendimiento_unidades)
                if receta.activa is not None:
                    campos.append("activa = %s"); valores.append(receta.activa)

                if campos:
                    campos.append("updated_at = CURRENT_TIMESTAMP")
                    valores.append(receta_id)
                    cur.execute(
                        f"UPDATE recetas SET {', '.join(campos)} WHERE id = %s",
                        tuple(valores),
                    )

                if receta.ingredientes is not None:
                    cur.execute("DELETE FROM receta_detalle WHERE receta_id = %s", (receta_id,))
                    for ing in receta.ingredientes:
                        cur.execute("""
                            INSERT INTO receta_detalle (receta_id, insumo_id, cantidad)
                            VALUES (%s, %s, %s)
                        """, (receta_id, ing.insumo_id, ing.cantidad))

                conn.commit()
                return {"message": "Receta actualizada exitosamente"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{receta_id}", status_code=200)
def eliminar_receta(receta_id: int):
    affected = execute_query(
        "UPDATE recetas SET activa = FALSE WHERE id = %s",
        (receta_id,),
        fetch=False,
    )
    if affected == 0:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    return {"message": "Receta desactivada exitosamente"}
