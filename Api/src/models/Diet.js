import mongoose from "mongoose";

const mealProp = {
  type: String,
  required: false,
  default: null
}

const DayDietSchema = new mongoose.Schema({
  breakfast: { ...mealProp },
  brunch: { ...mealProp },
  lunch: { ...mealProp },
  snack: { ...mealProp },
  dinner: { ...mealProp }
}, {
  _id: false,
  minimize: false
})

const DietSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  clientId: {
    type: String,
    required: true,
    ref: 'Client'
  },
  title: {
    type: String,
    required: true,
  },
  plan: {
    Monday: DayDietSchema,
    Tuesday: DayDietSchema,
    Wednesday: DayDietSchema,
    Thursday: DayDietSchema,
    Friday: DayDietSchema,
    Saturday: DayDietSchema,
    Sunday: DayDietSchema
  },
}, { timestamps: true, minimize: false });

const Diet = mongoose.model("Diet", DietSchema);

export default Diet;
