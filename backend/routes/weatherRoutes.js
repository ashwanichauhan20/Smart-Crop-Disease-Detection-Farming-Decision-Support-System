const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');

// GET /api/weather/dashboard
// Query: lat, lng, crop, stage
router.get('/dashboard', weatherController.getWeatherDashboard);

module.exports = router;
