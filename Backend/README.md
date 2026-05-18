# SIG-BAKERY — Backend

API REST del Sistema Integrado de Gestión Operativa para **Panadería CEFAS**.  
Construida con **FastAPI** + **PostgreSQL**.

---

## Estructura del proyecto

```
Backend/
├── main.py              # Punto de entrada: crea la app e incluye los routers
├── database.py          # Pool de conexiones y helpers de queries
├── schemas.py           # Modelos Pydantic de entrada y salida
├── requirements.txt     # Dependencias Python
├── schema.sql           # DDL + datos semilla de PostgreSQL
├── .env.example         # Variables de entorno requeridas
├── README.md
└── routers/
    ├── auth.py          # POST /api/auth/login
    ├── catalogos.py     # GET  /api/categorias, /unidades-medida, /insumos
    ├── recetas.py       # CRUD /api/recetas
    ├── productos.py     # GET  /api/productos
    ├── ventas.py        # CRUD /api/ventas  (descuento de stock FEFO)
    └── lotes.py         # CRUD /api/lotes   (rotación de inventario)
```

---

## Requisitos previos

| Herramienta | Versión mínima |
|-------------|----------------|
| Python      | 3.9            |
| PostgreSQL  | 14             |

---

## Instalación y puesta en marcha

### 1. Entorno virtual y dependencias

```bash
cd Backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Variables de entorno

```bash
cp .env.example .env
# Edita .env con los datos de tu instancia PostgreSQL
```

| Variable      | Descripción              | Valor por defecto |
|---------------|--------------------------|-------------------|
| `DB_HOST`     | Host de PostgreSQL       | `localhost`       |
| `DB_PORT`     | Puerto                   | `5432`            |
| `DB_NAME`     | Nombre de la base        | `sig_bakery`      |
| `DB_USER`     | Usuario                  | `postgres`        |
| `DB_PASSWORD` | Contraseña               | `postgres`        |

### 3. Base de datos

```bash
# Crea la base de datos
psql -U postgres -c "CREATE DATABASE sig_bakery;"

# Aplica el schema completo (tablas + datos semilla)
psql -U postgres -d sig_bakery -f schema.sql
```

También puedes automatizar este proceso con:

```bash
chmod +x scripts/configure_postgres.sh
./scripts/configure_postgres.sh --yes
```

> **Nota:** si la base ya existía y solo necesitas agregar la tabla de lotes,
> ejecuta únicamente el bloque `CREATE TABLE IF NOT EXISTS lotes_produccion ...`
> del archivo `schema.sql`.

### 4. Arrancar el servidor

```bash
# Desde el directorio Backend/ (con el venv activo o usando la ruta completa)
.venv/bin/uvicorn main:app --host localhost --port 8000 --reload --reload-dir routers
# → http://localhost:8000
```

---

## Solución de errores comunes

### Error: `source: no such file or directory: .../.venv/bin/activate`

El entorno virtual no existe o quedó incompleto.

```bash
cd /Users/hyatus/Documents/SIG_CEFAS
rm -rf Backend/.venv
python3 -m venv Backend/.venv
source Backend/.venv/bin/activate
```

### Error: `ModuleNotFoundError: No module named 'fastapi'`

La dependencia no está instalada en el entorno virtual activo.

```bash
cd /Users/hyatus/Documents/SIG_CEFAS
source Backend/.venv/bin/activate
pip install --upgrade pip
pip install -r Backend/requirements.txt
```

Verificación rápida:

```bash
python -c "import fastapi; print(fastapi.__version__)"
```

### Error: `[Errno 48] Address already in use`

El puerto `8000` ya está siendo usado por otro proceso.

```bash
lsof -ti :8000 | xargs kill -9
cd /Users/hyatus/Documents/SIG_CEFAS/Backend
source .venv/bin/activate
python main.py
```

### Nota útil

Si al ejecutar `source` copias/pegas el comando con un espacio inicial, puede fallar en algunas shells.
Ejemplo correcto:

```bash
source /Users/hyatus/Documents/SIG_CEFAS/Backend/.venv/bin/activate
```

---

## Documentación interactiva

| URL | Descripción |
|-----|-------------|
| `http://localhost:8000/docs`   | Swagger UI (prueba de endpoints) |
| `http://localhost:8000/redoc`  | ReDoc (referencia de la API)     |

---

## Endpoints

### Autenticación

| Método | Ruta              | Descripción                       |
|--------|-------------------|-----------------------------------|
| POST   | `/api/auth/login` | Inicia sesión, retorna datos del usuario |

**Body:**
```json
{ "email": "cajero1@cefas.gt", "password": "cajero123" }
```

**Respuesta exitosa:**
```json
{ "id": 2, "nombre": "Juan Pérez", "email": "cajero1@cefas.gt", "rol": "cajero" }
```

### Catálogos

| Método | Ruta                   | Descripción             |
|--------|------------------------|-------------------------|
| GET    | `/api/categorias`      | Lista categorías        |
| GET    | `/api/unidades-medida` | Lista unidades de medida|
| GET    | `/api/insumos`         | Lista insumos con stock |

### Recetas

| Método | Ruta                    | Descripción                          |
|--------|-------------------------|--------------------------------------|
| GET    | `/api/recetas`          | Lista recetas (filtros: `categoria_id`, `activa`) |
| GET    | `/api/recetas/{id}`     | Obtiene receta con ingredientes      |
| POST   | `/api/recetas`          | Crea receta con ingredientes         |
| PUT    | `/api/recetas/{id}`     | Actualiza receta (campos opcionales) |
| DELETE | `/api/recetas/{id}`     | Desactiva receta (soft delete)       |

### Productos

| Método | Ruta                    | Descripción                                  |
|--------|-------------------------|----------------------------------------------|
| GET    | `/api/productos`        | Lista productos (filtros: `buscar`, `solo_disponibles`) |
| GET    | `/api/productos/{id}`   | Obtiene un producto                          |

### Ventas

| Método | Ruta               | Descripción                                       |
|--------|--------------------|---------------------------------------------------|
| POST   | `/api/ventas`      | Registra venta, valida stock y calcula cambio     |
| GET    | `/api/ventas`      | Lista ventas recientes (`limit`, `offset`)        |
| GET    | `/api/ventas/{id}` | Obtiene venta con detalle                         |

### Lotes de producción (rotación FEFO)

| Método | Ruta                           | Descripción                                        |
|--------|--------------------------------|----------------------------------------------------|
| POST   | `/api/lotes`                   | Registra lote de producción y aumenta stock        |
| GET    | `/api/lotes`                   | Lista lotes (filtros: `producto_id`, `estado`)     |
| GET    | `/api/lotes/proximos-a-vencer` | Lotes activos que vencen en los próximos N días    |
| POST   | `/api/lotes/{id}/dar-de-baja`  | Descarta lote vencido y ajusta stock               |

**Estrategia FEFO:** al registrar una venta, el stock se descuenta automáticamente
del lote con fecha de vencimiento más próxima, minimizando el desperdicio de pan.

### Sistema

| Método | Ruta          | Descripción       |
|--------|---------------|-------------------|
| GET    | `/api/health` | Estado de la API  |

---

## Usuarios de prueba

| Email                  | Contraseña    | Rol          |
|------------------------|---------------|--------------|
| admin@cefas.gt         | `admin123`    | Administrador|
| cajero1@cefas.gt       | `cajero123`   | Cajero       |
| panadero1@cefas.gt     | `panadero123` | Panadero     |
