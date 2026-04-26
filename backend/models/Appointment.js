const mongoose = require('mongoose')

const appointmentSchema = new mongoose.Schema({
  expertId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expertName: { type: String, required: true },
  farmerName: { type: String, required: true },
  farmerContact: { type: String, required: true },
  farmerEmail: { type: String, required: true },
  date: { type: String, required: true },
  slot: { type: String, required: true },
  disease: { type: String, required: true },
  note: { type: String },
  attachedFileUrl: { type: String }, // For cloudinary link
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' },
  bookedAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Appointment', appointmentSchema)
