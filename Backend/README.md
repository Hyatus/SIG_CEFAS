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
    └── ventas.py        # CRUD /api/ventas
```

---

## Requisitos previos

| Herramienta | Versión mínima |
|-------------|----------------|
| Python      | 3.11           |
| PostgreSQL  | 14             |

---

## Instalación y puesta en marcha

### 1. Entorno virtual y dependencias

```bash
cd Backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
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

# Aplica el schema y los datos semilla
psql -U postgres -d sig_bakery -f schema.sql
```

También puedes automatizar este proceso (incluyendo reseteo de contraseña) con:

```bash
chmod +x scripts/configure_postgres.sh
./scripts/configure_postgres.sh --yes
```

Opcionalmente puedes cambiar usuario/clave/base:

```bash
./scripts/configure_postgres.sh --yes --db-user postgres --db-password postgres --db-name sig_bakery
```

### 4. Arrancar el servidor

```bash
python main.py
# → http://localhost:8000
```

O directamente con uvicorn:

```bash
uvicorn main:app --reload --port 8000
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
