import mongoose from "mongoose";

const EXPENSE_CATEGORIES = [
  "salary",
  "payroll_taxes",
  "rent",
  "utilities",
  "cleaning",
  "supplies",
  "inventory",
  "equipment",
  "maintenance",
  "marketing",
  "software",
  "professional_fees",
  "insurance",
  "taxes",
  "bank_fees",
  "transport",
  "training",
  "withdrawal",
  "other"
];

const expenseSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  brandId: { type: String, required: true, ref: "Brand" },
  storeId: { type: String, required: true, ref: "Store" }, // Fundamental para el punto de equilibrio por sucursal
  userId: { type: String, required: true, ref: "Staff" },

  amount: { type: Number, required: true, min: 0 },

  /*
    Categorías de gastos (mismo orden del enum, en español):
    1. Sueldos y salarios
    2. Cargas sociales e impuestos de nómina
    3. Renta
    4. Servicios (agua, luz, internet, gas, etc.)
    5. Limpieza
    6. Insumos y papelería
    7. Inventario o mercancía
    8. Equipamiento y mobiliario
    9. Mantenimiento y reparaciones
    10. Marketing y publicidad
    11. Software y suscripciones
    12. Honorarios profesionales
    13. Seguros
    14. Impuestos y permisos
    15. Comisiones y cargos bancarios
    16. Transporte y viáticos
    17. Capacitación
    18. Retiro de efectivo
    19. Otros
  */
  category: {
    type: String,
    enum: EXPENSE_CATEGORIES,
    default: "other"
  },
  description: { type: String, trim: true },
  
  source: {
    type: String,
    enum: ["cash_drawer", "bank_account"], // 'caja_física' o 'cuenta_bancaria'
    required: true
  },

  date: { type: Date, default: Date.now }
}, { timestamps: true });

expenseSchema.index({ brandId: 1, storeId: 1, date: -1 });

const Expense = mongoose.model("Expense", expenseSchema);

export default Expense;