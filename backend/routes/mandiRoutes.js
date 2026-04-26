const express = require('express')
const router = express.Router()
const {
  getNearbyMandis,
  getMandiPrices,
  getPricePrediction,
  getAllMandis,
  repairMandiDatabase
} = require('../controllers/mandiController')

// GET /api/mandis/all          — list all mandi names (autocomplete)
router.get('/all', getAllMandis)

// GET /api/mandis/repair       — Fix the database mappings explicitly
router.get('/repair', repairMandiDatabase)

// GET /api/mandis/nearby       — find mandis near lat/lng
// Query: lat, lng, radius (km)
router.get('/nearby', getNearbyMandis)

// GET /api/mandis/prices       — get crop prices at a mandi
// Query: mandi (name), crop (optional)
router.get('/prices', getMandiPrices)

// GET /api/mandis/prediction   — price trend + SELL/WAIT suggestion
// Query: mandi, crop
router.get('/prediction', getPricePrediction)

module.exports = router
