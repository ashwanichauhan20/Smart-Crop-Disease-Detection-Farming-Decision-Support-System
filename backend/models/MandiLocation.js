const mongoose = require('mongoose')

/**
 * MandiLocation — static dataset imported from CSV
 * Represents a physical agricultural market (mandi) with coordinates
 */
const mandiLocationSchema = new mongoose.Schema({
  mandi_name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  district: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    trim: true,
    default: ''
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
})

// Geospatial index for distance queries
mandiLocationSchema.index({ latitude: 1, longitude: 1 })

// Unique mandi name per district
mandiLocationSchema.index({ mandi_name: 1, district: 1 }, { unique: true })

module.exports = mongoose.model('MandiLocation', mandiLocationSchema)
