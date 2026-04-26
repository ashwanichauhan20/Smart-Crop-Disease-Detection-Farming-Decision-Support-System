const Appointment = require('../models/Appointment')

exports.bookAppointment = async (req, res) => {
  try {
    const appt = new Appointment(req.body)
    await appt.save()
    res.status(201).json({ success: true, data: appt })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

exports.getUserAppointments = async (req, res) => {
  try {
    const { userId } = req.params
    const appointments = await Appointment.find({
      $or: [{ farmerId: userId }, { expertId: userId }]
    }).sort({ bookedAt: -1 })
    res.status(200).json({ success: true, data: appointments })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    const appt = await Appointment.findByIdAndUpdate(id, { status }, { new: true })
    if (!appt) return res.status(404).json({ success: false, message: 'Not found' })
    res.status(200).json({ success: true, data: appt })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
