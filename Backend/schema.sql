-- ============================================================
-- SIG-BAKERY: Schema PostgreSQL
-- Módulos: Recetas + Punto de Venta (Carrito)
-- Moneda: Quetzales (Q)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- CATÁLOGOS
-- ============================================================

CREATE TABLE categorias (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE unidades_medida (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(50)  NOT NULL,
    abreviatura VARCHAR(10)  NOT NULL UNIQUE
);

-- ============================================================
-- USUARIOS
-- ============================================================

CREATE TABLE usuarios (
    id             SERIAL PRIMARY KEY,
    nombre         VARCHAR(150) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    rol            VARCHAR(20)  NOT NULL CHECK (rol IN ('admin', 'cajero', 'panadero')),
    activo         BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INSUMOS (MATERIA PRIMA)
-- ============================================================

CREATE TABLE insumos (
    id               SERIAL PRIMARY KEY,
    nombre           VARCHAR(150) NOT NULL,
    unidad_medida_id INTEGER NOT NULL REFERENCES unidades_medida(id),
    stock_actual     DECIMAL(12,4) NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    stock_minimo     DECIMAL(12,4) NOT NULL DEFAULT 0,
    costo_unitario   DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (costo_unitario >= 0),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_insumos_stock ON insumos (stock_actual) WHERE stock_actual <= stock_minimo;

-- ============================================================
-- RECETAS
-- ============================================================

CREATE TABLE recetas (
    id                    SERIAL PRIMARY KEY,
    nombre                VARCHAR(200) NOT NULL,
    categoria_id          INTEGER NOT NULL REFERENCES categorias(id),
    descripcion           TEXT,
    rendimiento_unidades  INTEGER NOT NULL DEFAULT 1 CHECK (rendimiento_unidades > 0),
    activa                BOOLEAN DEFAULT TRUE,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE receta_detalle (
    id          SERIAL PRIMARY KEY,
    receta_id   INTEGER NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
    insumo_id   INTEGER NOT NULL REFERENCES insumos(id),
    cantidad    DECIMAL(12,4) NOT NULL CHECK (cantidad > 0),
    UNIQUE(receta_id, insumo_id)
);

-- ============================================================
-- PRODUCTOS (PRODUCTO TERMINADO PARA VENTA)
-- ============================================================

CREATE TABLE productos (
    id            SERIAL PRIMARY KEY,
    nombre        VARCHAR(200) NOT NULL,
    receta_id     INTEGER REFERENCES recetas(id),
    precio_venta  DECIMAL(10,2) NOT NULL CHECK (precio_venta > 0),
    stock_actual  INTEGER NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    codigo_barras VARCHAR(50) UNIQUE,
    imagen_url    VARCHAR(500),
    activo        BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_productos_codigo ON productos (codigo_barras);
CREATE INDEX idx_productos_activo ON productos (activo) WHERE activo = TRUE;

-- ============================================================
-- VENTAS (TRANSACCIONES POS)
-- ============================================================

CREATE TABLE ventas (
    id              SERIAL PRIMARY KEY,
    usuario_id      INTEGER NOT NULL REFERENCES usuarios(id),
    fecha           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total           DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    monto_recibido  DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (monto_recibido >= 0),
    cambio          DECIMAL(10,2) NOT NULL DEFAULT 0,
    estado          VARCHAR(20) NOT NULL DEFAULT 'completada'
                        CHECK (estado IN ('pendiente', 'completada', 'cancelada')),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ventas_fecha    ON ventas (fecha DESC);
CREATE INDEX idx_ventas_usuario  ON ventas (usuario_id);

CREATE TABLE venta_detalle (
    id              SERIAL PRIMARY KEY,
    venta_id        INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id     INTEGER NOT NULL REFERENCES productos(id),
    cantidad        INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario > 0),
    subtotal        DECIMAL(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED
);

CREATE INDEX idx_venta_detalle_venta ON venta_detalle (venta_id);

-- ============================================================
-- TRIGGER: descontar stock al registrar una venta
-- ============================================================

CREATE OR REPLACE FUNCTION fn_descontar_stock_venta()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE productos
    SET stock_actual = stock_actual - NEW.cantidad
    WHERE id = NEW.producto_id;

    IF (SELECT stock_actual FROM productos WHERE id = NEW.producto_id) < 0 THEN
        RAISE EXCEPTION 'Stock insuficiente para el producto ID %', NEW.producto_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_descontar_stock_venta
AFTER INSERT ON venta_detalle
FOR EACH ROW EXECUTE FUNCTION fn_descontar_stock_venta();

-- ============================================================
-- FUNCIÓN: calcular costo total de una receta
-- ============================================================

CREATE OR REPLACE FUNCTION fn_calcular_costo_receta(p_receta_id INTEGER)
RETURNS DECIMAL AS $$
DECLARE
    v_costo DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(rd.cantidad * i.costo_unitario), 0)
    INTO v_costo
    FROM receta_detalle rd
    JOIN insumos i ON i.id = rd.insumo_id
    WHERE rd.receta_id = p_receta_id;

    RETURN v_costo;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- DATOS SEMILLA
-- Contraseñas: admin123 / cajero123 / panadero123
-- ============================================================

INSERT INTO unidades_medida (nombre, abreviatura) VALUES
    ('Kilogramo', 'kg'),
    ('Gramo',     'g'),
    ('Litro',     'L'),
    ('Mililitro', 'ml'),
    ('Unidad',    'u'),
    ('Libra',     'lb'),
    ('Onza',      'oz');

INSERT INTO categorias (nombre, descripcion) VALUES
    ('Pan tradicional', 'Panes de consumo diario'),
    ('Pan dulce',       'Panes con azúcar y coberturas'),
    ('Pastelería',      'Pasteles, tartas y postres'),
    ('Repostería fina', 'Galletas y productos especiales');

INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
    ('Admin CEFAS',  'admin@cefas.gt',      '$2b$12$XAUFxAs3uXeKChq0KKucDuNwckXMMrLQ/bT3AQ3ULcR.qTmrWzlNe', 'admin'),
    ('Juan Pérez',   'cajero1@cefas.gt',    '$2b$12$MILYbRC208sPO.bBSpIAaunygjKqfZ6lShSAZoxMjkycx9ANMyAKy',  'cajero'),
    ('Carlos López', 'panadero1@cefas.gt',  '$2b$12$TGy3WnwR0hBBp.QXgbs.Deb5mKWEQJNb7j.cZ0GcAIp.uAKD2.EcG', 'panadero');

INSERT INTO insumos (nombre, unidad_medida_id, stock_actual, stock_minimo, costo_unitario) VALUES
    ('Harina de trigo',    1, 100.0000, 20.0000,  5.50),
    ('Azúcar blanca',      1,  50.0000, 10.0000,  4.75),
    ('Huevos',             5, 200.0000, 50.0000,  1.25),
    ('Levadura seca',      1,  10.0000,  2.0000, 35.00),
    ('Mantequilla',        1,  25.0000,  5.0000, 28.00),
    ('Leche entera',       3,  40.0000, 10.0000,  8.50),
    ('Sal',                1,  15.0000,  3.0000,  2.00),
    ('Vainilla',           3,   5.0000,  1.0000, 45.00),
    ('Chocolate cobertura',1,  12.0000,  3.0000, 55.00),
    ('Canela molida',      1,   3.0000,  0.5000, 65.00);

INSERT INTO recetas (nombre, categoria_id, descripcion, rendimiento_unidades) VALUES
    ('Pan francés',           1, 'Pan crujiente tipo francés, receta clásica CEFAS', 50),
    ('Pan dulce de azúcar',   2, 'Pan dulce con cobertura de azúcar',                40),
    ('Pastel de chocolate',   3, 'Pastel de 3 capas con cobertura de chocolate',      1),
    ('Galletas de vainilla',  4, 'Galletas crujientes con esencia de vainilla',       60);

INSERT INTO receta_detalle (receta_id, insumo_id, cantidad) VALUES
    (1, 1, 5.0000), (1, 4, 0.1000), (1, 7, 0.0500), (1, 6, 1.0000),
    (2, 1, 4.0000), (2, 2, 1.5000), (2, 5, 0.5000), (2, 3, 6.0000), (2, 4, 0.0800),
    (3, 1, 2.0000), (3, 2, 1.0000), (3, 3, 8.0000), (3, 5, 1.0000), (3, 9, 0.5000), (3, 6, 0.5000),
    (4, 1, 3.0000), (4, 2, 1.2000), (4, 5, 0.8000), (4, 3, 4.0000), (4, 8, 0.0500);

INSERT INTO productos (nombre, receta_id, precio_venta, stock_actual, codigo_barras) VALUES
    ('Pan francés',                 1,  0.50, 150, '7501001001'),
    ('Pan dulce de azúcar',         2,  1.00,  80, '7501001002'),
    ('Pastel de chocolate (unidad)',3, 85.00,   5, '7501001003'),
    ('Galletas de vainilla (docena)',4, 15.00,  20, '7501001004'),
    ('Champurrada',              NULL,  1.50,  60, '7501001005'),
    ('Sheca',                    NULL,  2.00,  45, '7501001006'),
    ('Cachito con crema',        NULL,  3.50,  30, '7501001007'),
    ('Dona glaseada',            NULL,  2.50,  40, '7501001008');
