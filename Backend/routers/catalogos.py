from fastapi import APIRouter
from database import execute_query

router = APIRouter(prefix="/api", tags=["Catálogos"])


@router.get("/categorias")
def listar_categorias():
    return execute_query("SELECT * FROM categorias ORDER BY nombre")


@router.get("/unidades-medida")
def listar_unidades():
    return execute_query("SELECT * FROM unidades_medida ORDER BY nombre")


@router.get("/insumos")
def listar_insumos():
    return execute_query("""
        SELECT i.*, um.abreviatura AS unidad
        FROM insumos i
        JOIN unidades_medida um ON um.id = i.unidad_medida_id
        ORDER BY i.nombre
    """)
