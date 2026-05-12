from fastapi import APIRouter, HTTPException
from database import execute_query
from typing import Optional

router = APIRouter(prefix="/api/productos", tags=["Productos"])


@router.get("")
def listar_productos(
    buscar: Optional[str] = None,
    solo_disponibles: bool = True,
):
    query = """
        SELECT p.id, p.nombre, p.precio_venta, p.stock_actual,
               p.codigo_barras, p.imagen_url, p.activo
        FROM productos p
        WHERE p.activo = TRUE
    """
    params: list = []
    if solo_disponibles:
        query += " AND p.stock_actual > 0"
    if buscar:
        query += " AND (p.nombre ILIKE %s OR p.codigo_barras = %s)"
        params.extend([f"%{buscar}%", buscar])
    query += " ORDER BY p.nombre"
    return execute_query(query, tuple(params) if params else None)


@router.get("/{producto_id}")
def obtener_producto(producto_id: int):
    result = execute_query("SELECT * FROM productos WHERE id = %s", (producto_id,))
    if not result:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return result[0]
