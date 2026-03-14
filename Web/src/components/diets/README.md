// COMPONENTES DE DIETAS - Guía de Uso
// =====================================

// 1. ViewClientDiets.tsx
// ---------------------
// Muestra un diálogo con la lista de dietas de un cliente
// Se dispara desde un DropdownMenuItem (icono "Ver")
// 
// Props:
//   - clientId: string (ID del cliente)
//   - onClose?: () => void (callback opcional)
//
// Ejemplo de uso en una tabla de clientes:
// ```tsx
// import ViewClientDiets from '@/components/diets/ViewClientDiets'
//
// <ViewClientDiets clientId={cliente._id} />
// ```

// 2. ViewDietDetails.tsx
// ----------------------
// Tarjeta individual que muestra detalles de una dieta
// Incluye:
//   - Display en modo lectura
//   - Botón de edición (Pencil)
//   - Botón de eliminación (Trash) con confirmación
//   - Formulario de edición con validación Zod
//
// Props:
//   - clientId: string
//   - dietId: string
//   - onDietUpdated?: () => void (callback cuando se actualiza)
//   - onDietDeleted?: () => void (callback cuando se elimina)
//
// Ejemplo de uso (usado internamente por ViewClientDiets):
// ```tsx
// <ViewDietDetails
//   clientId="client123"
//   dietId="diet456"
//   onDietUpdated={() => reloadDiets()}
//   onDietDeleted={() => reloadDiets()}
// />
// ```

// 3. NewClientDiet.tsx
// --------------------
// Modal para crear una nueva dieta
// Incluye:
//   - Formulario con validación Zod + react-hook-form
//   - Campo de título requerido
//
// Props:
//   - clientId: string
//   - onDietCreated?: () => void (callback cuando se crea)
//
// Ejemplo de uso:
// ```tsx
// <NewClientDiet
//   clientId="client123"
//   onDietCreated={() => reloadDiets()}
// />
// ```

// SCHEMA DE VALIDACIÓN
// ====================
// Se encuentra en: diets.schemas.ts
// Usa Zod para validación completa del modelo Diet

// ENDPOINTS UTILIZADOS
// ====================
// POST   /v1/diets/create                           - Crear dieta
// GET    /v1/diets/:clientId/getAll                 - Listar dietas de cliente (proyección ligera)
// GET    /v1/diets/:clientId/getById/:id            - Obtener dieta completa
// PUT    /v1/diets/:clientId/update/:id             - Actualizar dieta
// DELETE /v1/diets/:clientId/delete/:id             - Eliminar dieta (hard delete)
