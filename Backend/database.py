"""
SIG-BAKERY: Capa de acceso a datos con pool de conexiones PostgreSQL.
"""
import os
from contextlib import contextmanager
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
from dotenv import load_dotenv

load_dotenv()

_pool: ConnectionPool | None = None


def _build_conninfo() -> str:
    """Construye el DSN de conexión a partir de variables de entorno."""
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return database_url
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "5432")
    dbname = os.getenv("DB_NAME", "sig_bakery")
    user = os.getenv("DB_USER", "postgres")
    password = os.getenv("DB_PASSWORD", "postgres")
    return f"host={host} port={port} dbname={dbname} user={user} password={password}"


def _get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            conninfo=_build_conninfo(),
            min_size=1,
            max_size=10,
            kwargs={"row_factory": dict_row},
        )
    return _pool


@contextmanager
def get_connection():
    """Contexto que entrega una conexión del pool y la devuelve al finalizar."""
    with _get_pool().connection() as conn:
        yield conn


def execute_query(query: str, params: tuple = None, fetch: bool = True):
    """Ejecuta un query simple (sin transacción explícita) y retorna resultados."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            result = cur.fetchall() if fetch else cur.rowcount
            conn.commit()
            return result


def execute_insert(query: str, params: tuple = None) -> int:
    """Ejecuta un INSERT con RETURNING id y retorna el ID generado."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            row = cur.fetchone()
            conn.commit()
            return row["id"]
