import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  userId: { type: String, ref: 'User', required: true },
  validFrom: { type: Date, required: true },
  validUntil: { type: Date, default: null },

  // Definimos exactamente los 7 días
  days: [{
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0, max: 6 // 0=Dom, 1=Lun...
    },
    active: { type: Boolean, default: false }, // Si es false, es su día de descanso
    slots: [{
      startTime: String, // "22:00"
      endTime: String,   // "06:00" (El sistema entenderá que si end < start, es el día siguiente)
      label: String      // "Turno Noche", "Refuerzo", etc.
    }]
  }]
});

const Schedule = mongoose.model('Schedule', scheduleSchema);
export default Schedule;    