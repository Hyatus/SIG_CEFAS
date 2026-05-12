"""
SIG-BAKERY: Capa de acceso a datos con pool de conexiones PostgreSQL.
"""
import os
from contextlib import contextmanager
from typing import Optional
from psycopg2.pool import ThreadedConnectionPool
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

_pool: Optional[ThreadedConnectionPool] = None


def _get_pool() -> ThreadedConnectionPool:
    global _pool
    if _pool is None:
        database_url = os.getenv("DATABASE_URL")
        if database_url:
            _pool = ThreadedConnectionPool(
                minconn=1,
                maxconn=10,
                dsn=database_url,
                cursor_factory=RealDictCursor,
            )
        else:
            _pool = ThreadedConnectionPool(
                minconn=1,
                maxconn=10,
                host=os.getenv("DB_HOST", "localhost"),
                port=int(os.getenv("DB_PORT", "5432")),
                database=os.getenv("DB_NAME", "sig_bakery"),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD", "postgres"),
                cursor_factory=RealDictCursor,
            )
    return _pool


@contextmanager
def get_connection():
    """Contexto que entrega una conexión del pool y la devuelve al finalizar."""
    pool = _get_pool()
    conn = pool.getconn()
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


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
