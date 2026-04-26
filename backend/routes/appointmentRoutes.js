const express = require('express')
const router = express.Router()
const { bookAppointment, getUserAppointments, updateAppointmentStatus } = require('../controllers/appointmentController')

router.post('/', bookAppointment)
router.get('/user/:userId', getUserAppointments)
router.put('/:id/status', updateAppointmentStatus)

module.exports = router
