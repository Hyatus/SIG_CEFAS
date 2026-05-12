from fastapi import APIRouter, HTTPException
from database import execute_query
from schemas import LoginRequest, UserResponse
import bcrypt as _bcrypt

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])


@router.post("/login", response_model=UserResponse)
def login(req: LoginRequest):
    rows = execute_query(
        "SELECT id, nombre, email, password_hash, rol FROM usuarios WHERE email = %s AND activo = TRUE",
        (req.email,),
    )
    if not rows:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    user = rows[0]
    try:
        valid = _bcrypt.checkpw(
            req.password.encode("utf-8"),
            user["password_hash"].encode("utf-8"),
        )
    except Exception:
        valid = False

    if not valid:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    return UserResponse(
        id=user["id"],
        nombre=user["nombre"],
        email=user["email"],
        rol=user["rol"],
    )
