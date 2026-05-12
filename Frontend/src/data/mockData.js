export const CATEGORIAS = [
  { id: 1, nombre: 'Pan tradicional' },
  { id: 2, nombre: 'Pan dulce' },
  { id: 3, nombre: 'Pastelería' },
  { id: 4, nombre: 'Repostería fina' },
]

export const INSUMOS = [
  { id: 1,  nombre: 'Harina de trigo',      unidad: 'kg', costo_unitario: 5.5  },
  { id: 2,  nombre: 'Azúcar blanca',         unidad: 'kg', costo_unitario: 4.75 },
  { id: 3,  nombre: 'Huevos',                unidad: 'u',  costo_unitario: 1.25 },
  { id: 4,  nombre: 'Levadura seca',         unidad: 'kg', costo_unitario: 35.0 },
  { id: 5,  nombre: 'Mantequilla',           unidad: 'kg', costo_unitario: 28.0 },
  { id: 6,  nombre: 'Leche entera',          unidad: 'L',  costo_unitario: 8.5  },
  { id: 7,  nombre: 'Sal',                   unidad: 'kg', costo_unitario: 2.0  },
  { id: 8,  nombre: 'Vainilla',              unidad: 'L',  costo_unitario: 45.0 },
  { id: 9,  nombre: 'Chocolate cobertura',   unidad: 'kg', costo_unitario: 55.0 },
  { id: 10, nombre: 'Canela molida',         unidad: 'kg', costo_unitario: 65.0 },
]

export const PRODUCTOS_INIT = [
  { id: 1, nombre: 'Pan francés',      precio_venta: 0.5,  stock_actual: 150, codigo_barras: '7501001001', categoria_id: 1 },
  { id: 2, nombre: 'Pan dulce',        precio_venta: 1.0,  stock_actual: 80,  codigo_barras: '7501001002', categoria_id: 2 },
  { id: 3, nombre: 'Pastel chocolate', precio_venta: 85.0, stock_actual: 5,   codigo_barras: '7501001003', categoria_id: 3 },
  { id: 4, nombre: 'Galletas vainilla',precio_venta: 15.0, stock_actual: 20,  codigo_barras: '7501001004', categoria_id: 4 },
  { id: 5, nombre: 'Champurrada',      precio_venta: 1.5,  stock_actual: 60,  codigo_barras: '7501001005', categoria_id: 2 },
  { id: 6, nombre: 'Sheca',            precio_venta: 2.0,  stock_actual: 45,  codigo_barras: '7501001006', categoria_id: 1 },
  { id: 7, nombre: 'Cachito crema',    precio_venta: 3.5,  stock_actual: 30,  codigo_barras: '7501001007', categoria_id: 2 },
  { id: 8, nombre: 'Dona glaseada',    precio_venta: 2.5,  stock_actual: 40,  codigo_barras: '7501001008', categoria_id: 4 },
]

export const RECETAS_INIT = [
  {
    id: 1, nombre: 'Pan francés', categoria_id: 1, activa: true,
    descripcion: 'Pan crujiente tipo francés, receta clásica CEFAS',
    rendimiento_unidades: 50,
    ingredientes: [
      { insumo_id: 1, cantidad: 5.0  },
      { insumo_id: 4, cantidad: 0.1  },
      { insumo_id: 7, cantidad: 0.05 },
      { insumo_id: 6, cantidad: 1.0  },
    ],
  },
  {
    id: 2, nombre: 'Pan dulce de azúcar', categoria_id: 2, activa: true,
    descripcion: 'Pan dulce con cobertura de azúcar',
    rendimiento_unidades: 40,
    ingredientes: [
      { insumo_id: 1, cantidad: 4.0  },
      { insumo_id: 2, cantidad: 1.5  },
      { insumo_id: 5, cantidad: 0.5  },
      { insumo_id: 3, cantidad: 6.0  },
      { insumo_id: 4, cantidad: 0.08 },
    ],
  },
  {
    id: 3, nombre: 'Pastel de chocolate', categoria_id: 3, activa: true,
    descripcion: 'Pastel de 3 capas con cobertura de chocolate',
    rendimiento_unidades: 1,
    ingredientes: [
      { insumo_id: 1, cantidad: 2.0 },
      { insumo_id: 2, cantidad: 1.0 },
      { insumo_id: 3, cantidad: 8.0 },
      { insumo_id: 5, cantidad: 1.0 },
      { insumo_id: 9, cantidad: 0.5 },
      { insumo_id: 6, cantidad: 0.5 },
    ],
  },
  {
    id: 4, nombre: 'Galletas de vainilla', categoria_id: 4, activa: true,
    descripcion: 'Galletas crujientes con esencia de vainilla',
    rendimiento_unidades: 60,
    ingredientes: [
      { insumo_id: 1, cantidad: 3.0  },
      { insumo_id: 2, cantidad: 1.2  },
      { insumo_id: 5, cantidad: 0.8  },
      { insumo_id: 3, cantidad: 4.0  },
      { insumo_id: 8, cantidad: 0.05 },
    ],
  },
]
