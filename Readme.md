# SIG-CEFAS — Sistema Integrado de Gestión Operativa

Sistema web para la administración de **Panadería CEFAS**. Cubre el flujo completo desde la materia prima hasta el punto de venta: gestión de insumos, recetas con cálculo automático de costos, productos terminados y ventas con cálculo de cambio en quetzales (Q).

Compuesto por dos aplicaciones independientes que se comunican por HTTP/JSON:

- **Backend** — API REST en FastAPI sobre PostgreSQL.
- **Frontend** — SPA en React + Vite + Tailwind CSS.

---

## Arquitectura general

```text
┌───────────────────────┐      HTTP/JSON       ┌──────────────────────┐      SQL       ┌──────────────────┐
│  Frontend (React)     │ ───────────────────► │  Backend (FastAPI)   │ ─────────────► │   PostgreSQL     │
│  Vite · Tailwind      │ ◄─────────────────── │  Pydantic · psycopg  │ ◄───────────── │   sig_bakery     │
└───────────────────────┘                      └──────────────────────┘                └──────────────────┘
       Puerto 5173                                    Puerto 8000                          Puerto 5432
```

Cada capa es desplegable por separado. El frontend consume la API a través de `Frontend/src/api.js`; el backend gestiona un pool de conexiones a PostgreSQL en `Backend/database.py`.

---

## Estructura del repositorio

```text
SIG_CEFAS/
├── Backend/                     # API REST en FastAPI
│   ├── main.py                  # Entrada de la app + CORS + registro de routers
│   ├── database.py              # Pool de conexiones (psycopg-pool)
│   ├── schemas.py               # Modelos Pydantic (request/response)
│   ├── schema.sql               # DDL + datos semilla
│   ├── requirements.txt
│   └── routers/
│       ├── auth.py              # POST /api/auth/login (bcrypt)
│       ├── catalogos.py         # categorías, unidades de medida, insumos
│       ├── recetas.py           # CRUD de recetas + cálculo de costo
│       ├── productos.py         # Catálogo de productos terminados
│       └── ventas.py            # Carrito, validación de stock, cambio
│
├── Frontend/                    # SPA en React + Vite
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── main.jsx             # Bootstrap React
│       ├── App.jsx              # Layout raíz (sidebar + outlet)
│       ├── api.js               # Cliente HTTP centralizado
│       ├── index.css            # Estilos globales + utilidades
│       ├── components/
│       │   ├── Sidebar.jsx      # Navegación + drawer móvil
│       │   └── Toast.jsx        # Notificaciones emergentes
│       └── modules/
│           ├── login/LoginPage.jsx
│           ├── pos/ModuloPOS.jsx           # CU-01 Punto de Venta
│           └── recetas/
│               ├── ModuloRecetas.jsx       # CU-05 Recetario
│               └── RecetaForm.jsx
│
└── Readme.md                    # Este documento
```

---

## Backend

### Stack del backend

| Capa            | Tecnología                       |
|-----------------|----------------------------------|
| Framework HTTP  | FastAPI 0.115                    |
| Servidor ASGI   | Uvicorn 0.30 (modo `standard`)   |
| Driver SQL      | psycopg 3.2 + psycopg-pool 3.2   |
| Validación      | Pydantic 2.9 (con `email`)       |
| Hashing         | bcrypt 4.2                       |
| Configuración   | python-dotenv 1.0                |

### Diseño en capas

1. **Routers (`Backend/routers/`)** — un módulo por dominio (auth, catálogos, recetas, productos, ventas). Cada router agrupa los endpoints HTTP, valida con Pydantic y delega a la capa de datos.
2. **Modelos Pydantic (`schemas.py`)** — separan `*Create`, `*Update`, `*Response`. Garantizan tipos correctos en entrada y serializan la salida.
3. **Capa de datos (`database.py`)** — pool de conexiones global (1 a 10 conexiones). Expone:
   - `get_connection()` — context manager para transacciones explícitas.
   - `execute_query()` — para SELECT/UPDATE/DELETE simples con commit automático.
   - `execute_insert()` — INSERT con `RETURNING id`.
4. **Esquema y semilla (`schema.sql`)** — un único archivo idempotente que define toda la base y carga datos de prueba.

### Variables de entorno

| Variable        | Default        | Descripción                          |
|-----------------|----------------|--------------------------------------|
| `DATABASE_URL`  | *(opcional)*   | DSN completo; si se define ignora las demás |
| `DB_HOST`       | `localhost`    | Host de PostgreSQL                   |
| `DB_PORT`       | `5432`         | Puerto                               |
| `DB_NAME`       | `sig_bakery`   | Nombre de la base de datos           |
| `DB_USER`       | `postgres`     | Usuario                              |
| `DB_PASSWORD`   | `postgres`     | Contraseña                           |

### Puesta en marcha del backend

```bash
cd Backend
python -m venv .venv
.venv\Scripts\activate              # Windows PowerShell
pip install -r requirements.txt

cp .env.example .env                # ajusta credenciales
psql -U postgres -c "CREATE DATABASE sig_bakery;"
psql -U postgres -d sig_bakery -f schema.sql

uvicorn main:app --reload --port 8000
```

Documentación interactiva:

- Swagger UI → `http://localhost:8000/docs`
- ReDoc      → `http://localhost:8000/redoc`

### Endpoints principales

| Método | Ruta                       | Función                                    |
|--------|----------------------------|--------------------------------------------|
| POST   | `/api/auth/login`          | Login con bcrypt, retorna perfil           |
| GET    | `/api/categorias`          | Catálogo de categorías de receta           |
| GET    | `/api/unidades-medida`     | Unidades de medida                         |
| GET    | `/api/insumos`             | Insumos con stock y costo unitario         |
| GET    | `/api/recetas`             | Lista recetas (filtros: categoría, activa) |
| POST   | `/api/recetas`             | Crea receta con ingredientes               |
| PUT    | `/api/recetas/{id}`        | Actualiza receta                           |
| DELETE | `/api/recetas/{id}`        | Desactiva (soft delete)                    |
| GET    | `/api/productos`           | Productos disponibles para POS             |
| POST   | `/api/ventas`              | Registra venta, descuenta stock, calcula cambio |
| GET    | `/api/ventas`              | Histórico de ventas                        |
| GET    | `/api/health`              | Estado de la API                           |

---

## Frontend

### Stack del frontend

| Herramienta   | Versión | Uso                                  |
|---------------|---------|--------------------------------------|
| React         | 18      | UI declarativa basada en componentes |
| Vite          | 5       | Bundler + servidor de desarrollo     |
| Tailwind CSS  | 3       | Estilos utilitarios                  |
| Lucide React  | 0.344   | Iconografía SVG                      |

### Módulos funcionales

| Módulo         | Caso de uso | Descripción                                                |
|----------------|-------------|------------------------------------------------------------|
| Login          | —           | Autenticación contra `/api/auth/login`                     |
| Punto de Venta | CU-01       | Búsqueda, carrito, cobro y cálculo de cambio               |
| Recetario      | CU-05       | CRUD de recetas con cálculo automático de costo por unidad |

### Diseño visual

- **Tipografía:** Varela Round (títulos) · Nunito Sans (cuerpo).
- **Paleta:** ámbar / marrón cálido (`amber-50` → `amber-950`).
- **Iconos:** Lucide React (no emojis como íconos de interfaz).
- **Accesibilidad:** atributos `aria-*`, contraste mínimo 4.5:1, navegación por teclado, drawer móvil con backdrop.

### Puesta en marcha del frontend

```bash
cd Frontend
npm install
npm run dev                # http://localhost:5173
npm run build              # genera dist/
npm run preview            # previsualiza el build
```

---

## Base de datos

La base **`sig_bakery`** corre sobre PostgreSQL 14+ y se define íntegramente en [Backend/schema.sql](Backend/schema.sql). El esquema fue diseñado bajo los principios de normalización relacional **hasta 3FN**, separando catálogos, entidades transaccionales y tablas de detalle (M:N).

### Decisiones de diseño

1. **Moneda única:** Quetzales (Q) con `DECIMAL(10,2)` — evita el redondeo de `FLOAT`.
2. **Cantidades de receta:** `DECIMAL(12,4)` — permite expresar gramos, mililitros y unidades fraccionarias con precisión.
3. **Borrado lógico:** las entidades de catálogo (`productos`, `recetas`, `usuarios`) usan banderas `activo`/`activa` en lugar de `DELETE`, preservando la integridad histórica de las ventas.
4. **Integridad declarativa:** se evita lógica en la aplicación cuando la base puede garantizarla — `CHECK`, `UNIQUE`, `FOREIGN KEY`, `NOT NULL`.
5. **Columnas calculadas:** `venta_detalle.subtotal` es `GENERATED ALWAYS AS (cantidad * precio_unitario) STORED` — el motor garantiza el valor, no la aplicación.
6. **Trazabilidad temporal:** todas las tablas relevantes incluyen `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`.

### Diagrama lógico

```text
                              ┌──────────────────┐
                              │   categorias     │
                              │ id (PK)          │
                              │ nombre (UQ)      │
                              └─────────┬────────┘
                                        │ 1
                                        │
                                        │ N
┌──────────────────┐   N    1  ┌────────▼─────────┐
│ unidades_medida  │◄──────────┤     recetas      │
│ id (PK)          │           │ id (PK)          │
│ abreviatura (UQ) │           │ categoria_id (FK)│
└────────┬─────────┘           │ rendimiento_und  │
         │ 1                   │ activa           │
         │                     └───────┬──────────┘
         │ N                           │ 1
┌────────▼─────────┐   N    M          │
│     insumos      │◄─────────────┐    │ N
│ id (PK)          │              │    │
│ unidad_medida_id │       ┌──────▼────▼─────────┐
│ stock_actual     │       │  receta_detalle     │
│ stock_minimo     │       │ id (PK)             │
│ costo_unitario   │       │ receta_id (FK)      │
└──────────────────┘       │ insumo_id (FK)      │
                           │ cantidad            │
                           │ UNIQUE(receta,insumo)│
                           └─────────────────────┘

┌──────────────────┐   1    N  ┌──────────────────┐
│    productos     │◄──────────┤  venta_detalle   │
│ id (PK)          │           │ id (PK)          │
│ receta_id (FK)   │           │ venta_id (FK)    │
│ precio_venta     │           │ producto_id (FK) │
│ stock_actual     │           │ cantidad         │
│ codigo_barras(UQ)│           │ precio_unitario  │
│ activo           │           │ subtotal (GEN)   │
└────────▲─────────┘           └────────┬─────────┘
         │ 1                            │ N
         │                              │
         │ N                            │ 1
         │                     ┌────────▼─────────┐    N    1  ┌──────────────┐
         └─────────────────────┤      ventas      ├───────────►│   usuarios   │
                               │ id (PK)          │            │ id (PK)      │
                               │ usuario_id (FK)  │            │ email (UQ)   │
                               │ total            │            │ password_hash│
                               │ monto_recibido   │            │ rol (CHECK)  │
                               │ cambio           │            └──────────────┘
                               │ estado (CHECK)   │
                               └──────────────────┘
```

### Catálogo de tablas

| Tabla              | Cardinalidad | Propósito                                              |
|--------------------|--------------|--------------------------------------------------------|
| `categorias`       | catálogo     | Clasifica recetas (pan tradicional, dulce, pastelería) |
| `unidades_medida`  | catálogo     | Unidades de los insumos (kg, g, L, ml, u, lb, oz)      |
| `usuarios`         | maestra      | Operadores del sistema, con rol y hash bcrypt          |
| `insumos`          | maestra      | Materia prima con stock y costo unitario               |
| `recetas`          | maestra      | Fórmulas de elaboración                                |
| `receta_detalle`   | M:N          | Asocia recetas ↔ insumos con cantidad                  |
| `productos`        | maestra      | Productos terminados a la venta                        |
| `ventas`           | transaccional| Cabecera de cada transacción POS                       |
| `venta_detalle`    | transaccional| Líneas de venta (productos vendidos por transacción)   |

### Proceso de normalización

El modelo nació de un caso de uso plano («registrar la venta de productos elaborados con ciertos insumos») y se llevó hasta tercera forma normal aplicando las reglas en cascada:

#### Primera forma normal (1FN) — atomicidad

Cada columna almacena un único valor escalar. Lo que conceptualmente sería una lista, se materializa como tabla de detalle:

- Una receta no tiene un campo `ingredientes TEXT` con valores separados por coma → existe la tabla `receta_detalle`.
- Una venta no tiene un campo `productos TEXT` → existe la tabla `venta_detalle`.

#### Segunda forma normal (2FN) — dependencia completa de la clave

Los atributos no clave dependen de **toda** la clave primaria, no solo de una parte. En las tablas con relación M:N este principio se vuelve evidente:

- En `receta_detalle`, la `cantidad` depende del par `(receta_id, insumo_id)` — no del insumo solo, ni de la receta sola. Por eso `UNIQUE(receta_id, insumo_id)` y `cantidad` viven juntos en una entidad propia.
- En `venta_detalle`, `cantidad` y `precio_unitario` dependen del par `(venta_id, producto_id)`. Adicionalmente se **congela** el `precio_unitario` al momento de la venta en lugar de leerlo de `productos.precio_venta` — esto preserva la historia frente a cambios futuros de precio.

#### Tercera forma normal (3FN) — sin dependencias transitivas

Ningún atributo no clave depende de otro atributo no clave. Para lograrlo se extrajeron entidades hijas:

- El **costo de una receta** no se almacena: depende transitivamente de los insumos. Se calcula con la función `fn_calcular_costo_receta(p_receta_id)` que recorre `receta_detalle` y multiplica por `insumos.costo_unitario`. Esto elimina anomalías de actualización: si cambia el costo de un insumo, el costo de la receta queda automáticamente actualizado.
- El **nombre de la unidad de medida** vive en `unidades_medida`, no se duplica en `insumos`. `insumos.unidad_medida_id` es una FK pura.
- La **categoría** de una receta vive en `categorias`, referenciada por `recetas.categoria_id`.
- El **subtotal** de una línea de venta se deriva (`cantidad * precio_unitario`) y se materializa como columna `GENERATED ALWAYS AS … STORED` — semánticamente derivada, físicamente persistida para acelerar reportes, pero imposible de inconsistir porque el motor la calcula.

#### Concesiones controladas

Algunas decisiones se apartan deliberadamente de la 3FN estricta por razones operativas:

| Caso                            | Decisión                                   | Justificación                                                    |
|---------------------------------|--------------------------------------------|------------------------------------------------------------------|
| `venta_detalle.precio_unitario` | Se copia al momento de la venta            | Inmutabilidad histórica frente a cambios de precio del producto  |
| `ventas.total`, `ventas.cambio` | Se almacenan, no se calculan en cada query | Performance en listados y cierres                                |
| `productos.stock_actual`        | Contador denormalizado                     | El descuento se hace transaccionalmente en `ventas.py`           |

### Integridad referencial y reglas de negocio

| Mecanismo                                   | Regla que protege                                          |
|---------------------------------------------|------------------------------------------------------------|
| `usuarios.rol CHECK (admin/cajero/panadero)`| Solo tres roles válidos                                    |
| `usuarios.email UNIQUE`                     | Un email = un usuario                                      |
| `productos.codigo_barras UNIQUE`            | Códigos de barras no se repiten                            |
| `productos.stock_actual >= 0`               | Imposible vender más stock del existente                   |
| `insumos.stock_actual >= 0`                 | Imposible consumir insumo inexistente                      |
| `ventas.estado CHECK (...)`                 | Estados acotados                                           |
| `venta_detalle.cantidad > 0`                | No hay líneas con cantidad cero o negativa                 |
| `UNIQUE(receta_id, insumo_id)`              | Un insumo aparece una sola vez por receta                  |
| `ON DELETE CASCADE` en detalles             | Al borrar la cabecera, las líneas no quedan huérfanas      |

### Índices

| Índice                          | Tabla          | Justificación                                       |
|---------------------------------|----------------|-----------------------------------------------------|
| `idx_insumos_stock` (parcial)   | `insumos`      | Alerta rápida de insumos bajo el mínimo             |
| `idx_productos_codigo`          | `productos`    | Búsqueda por código de barras en POS                |
| `idx_productos_activo` (parcial)| `productos`    | Solo productos activos en catálogo POS              |
| `idx_ventas_fecha`              | `ventas`       | Reporte cronológico (ORDER BY fecha DESC)           |
| `idx_ventas_usuario`            | `ventas`       | Reporte por cajero                                  |
| `idx_venta_detalle_venta`       | `venta_detalle`| JOIN al expandir el detalle de una venta            |

### Transaccionalidad del POS

El descuento de stock al vender no se modela con triggers; vive en [Backend/routers/ventas.py](Backend/routers/ventas.py) dentro de una misma transacción:

1. `BEGIN`
2. Validar stock disponible.
3. `INSERT INTO ventas` (cabecera).
4. Por cada producto: `INSERT INTO venta_detalle` + `UPDATE productos SET stock_actual = stock_actual - cantidad RETURNING stock_actual`.
5. El `CHECK (stock_actual >= 0)` aborta la transacción si alguien intenta sobrevender → `ROLLBACK` automático.
6. `COMMIT`.

Esto convierte al motor en el guardián final de la regla «no vender lo que no hay», sin importar qué cliente ataque la API.

---

## Usuarios de prueba

| Email                | Contraseña    | Rol      |
|----------------------|---------------|----------|
| `admin@cefas.gt`     | `admin123`    | admin    |
| `cajero1@cefas.gt`   | `cajero123`   | cajero   |
| `panadero1@cefas.gt` | `panadero123` | panadero |

---

## Convenciones

- **Idioma:** español en código, datos y documentación (nombres de tabla, columnas, mensajes).
- **Estilo SQL:** snake_case, plural para tablas, `_id` para claves foráneas.
- **Estilo Python:** PEP 8, type hints, `dict_row` para resultados como diccionarios.
- **Estilo React:** componentes funcionales, hooks, archivos `.jsx` con PascalCase.
- **Mensajes de commit:** convencionales en inglés (`feat:`, `fix:`, `refactor:`).
