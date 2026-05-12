"""
SIG-BAKERY: API REST — punto de entrada principal.
Levanta la app, registra los routers y arranca uvicorn en modo dev.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, catalogos, recetas, productos, ventas

app = FastAPI(
    title="SIG-BAKERY API",
    description="Sistema Integrado de Gestión Operativa — Panadería CEFAS",
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

_extra_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
_origins = [o.strip() for o in _extra_origins if o.strip()] + [
    "https://frontend-production-0f94.up.railway.app",
    "http://localhost:3000",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

app.include_router(auth.router)
app.include_router(catalogos.router)
app.include_router(recetas.router)
app.include_router(productos.router)
app.include_router(ventas.router)


@app.get("/api/health", tags=["Sistema"])
def health_check():
    return {"status": "ok", "service": "SIG-BAKERY API", "version": "1.1.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
