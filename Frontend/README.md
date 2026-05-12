# SIG-Bakery — Frontend

Interfaz web del Sistema de Información Gerencial para la Panadería CEFAS. Construida con React + Vite + Tailwind CSS.

## Requisitos

- [Node.js](https://nodejs.org) v18 o superior
- npm v9 o superior

## Instalación

```bash
cd Frontend
npm install
```

## Desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en el navegador.

## Producción

```bash
npm run build    # genera la carpeta dist/
npm run preview  # previsualiza el build
```

## Estructura

```
src/
├── App.jsx                        # Layout raíz: sidebar + área de contenido
├── main.jsx                       # Punto de entrada de React
├── index.css                      # Estilos globales y clases utilitarias
├── data/
│   └── mockData.js                # Datos simulados (categorías, insumos, productos, recetas)
├── components/
│   ├── Sidebar.jsx                # Navegación lateral
│   └── Toast.jsx                  # Notificaciones emergentes
└── modules/
    ├── pos/
    │   └── ModuloPOS.jsx          # Punto de Venta — CU-01
    └── recetas/
        ├── ModuloRecetas.jsx      # Gestión de recetas — CU-05
        └── RecetaForm.jsx         # Formulario de creación/edición de receta
```

## Módulos

| Módulo | Caso de uso | Descripción |
|--------|-------------|-------------|
| Punto de Venta | CU-01 | Búsqueda de productos, carrito y cobro con cálculo de cambio |
| Recetario | CU-05 | CRUD de recetas con cálculo automático de costo por unidad |

## Stack

| Herramienta | Versión | Uso |
|-------------|---------|-----|
| React | 18 | UI declarativa |
| Vite | 5 | Bundler y servidor de desarrollo |
| Tailwind CSS | 3 | Estilos utilitarios |
| Lucide React | 0.344 | Íconos SVG |

## Diseño

- **Tipografía:** Varela Round (títulos) · Nunito Sans (cuerpo)
- **Paleta:** ámbar/marrón cálido — `amber-50` a `amber-950`
- **Fuente de íconos:** Lucide React (sin emojis como íconos de interfaz)
- **Accesibilidad:** atributos `aria-*`, contraste mínimo 4.5:1, navegación por teclado
