"""
SIG-BAKERY: Modelos Pydantic de entrada y salida por dominio.
"""
from pydantic import BaseModel, Field, EmailStr, model_validator
from typing import Optional
from datetime import datetime, date


# ============================================================
# AUTH / USUARIOS
# ============================================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class UserResponse(BaseModel):
    id: int
    nombre: str
    email: EmailStr
    rol: str


# ============================================================
# RECETAS
# ============================================================

class InsumoReceta(BaseModel):
    insumo_id: int
    cantidad: float = Field(gt=0)


class RecetaCreate(BaseModel):
    nombre: str = Field(min_length=2, max_length=200)
    categoria_id: int
    descripcion: Optional[str] = None
    rendimiento_unidades: int = Field(gt=0, default=1)
    ingredientes: list[InsumoReceta] = Field(min_length=1)


class RecetaUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=2, max_length=200)
    categoria_id: Optional[int] = None
    descripcion: Optional[str] = None
    rendimiento_unidades: Optional[int] = Field(default=None, gt=0)
    activa: Optional[bool] = None
    ingredientes: Optional[list[InsumoReceta]] = None


class RecetaResponse(BaseModel):
    id: int
    nombre: str
    categoria_id: int
    categoria_nombre: Optional[str] = None
    descripcion: Optional[str] = None
    rendimiento_unidades: int
    costo_total: float
    activa: bool
    ingredientes: Optional[list[dict]] = None
    created_at: Optional[datetime] = None


# ============================================================
# PRODUCTOS
# ============================================================

class ProductoResponse(BaseModel):
    id: int
    nombre: str
    precio_venta: float
    stock_actual: int
    codigo_barras: Optional[str] = None
    imagen_url: Optional[str] = None
    activo: bool


# ============================================================
# VENTAS (CARRITO / POS)
# ============================================================

class ItemCarrito(BaseModel):
    producto_id: int
    cantidad: int = Field(gt=0)


class VentaCreate(BaseModel):
    usuario_id: int
    items: list[ItemCarrito] = Field(min_length=1)
    monto_recibido: float = Field(gt=0)


class VentaResponse(BaseModel):
    id: int
    usuario_id: int
    fecha: datetime
    total: float
    monto_recibido: float
    cambio: float
    estado: str
    detalle: Optional[list[dict]] = None


# ============================================================
# LOTES DE PRODUCCIÓN
# ============================================================

class LoteCreate(BaseModel):
    producto_id: int
    cantidad: int = Field(gt=0)
    fecha_produccion: date = Field(default_factory=date.today)
    fecha_vencimiento: date

    @model_validator(mode="after")
    def validar_fechas(self):
        if self.fecha_vencimiento < self.fecha_produccion:
            raise ValueError("La fecha de vencimiento debe ser igual o posterior a la fecha de producción")
        return self
