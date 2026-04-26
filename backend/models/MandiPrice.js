const mongoose = require('mongoose')

/**
 * MandiPrice — scraped price data from Agmarknet
 * Unique per (mandi + crop + date) to prevent duplicates
 */
const mandiPriceSchema = new mongoose.Schema({
  mandi: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  district: {
    type: String,
    trim: true,
    default: ''
  },
  state: {
    type: String,
    trim: true,
    default: ''
  },
  crop: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  variety: {
    type: String,
    trim: true,
    default: ''
  },
  min_price: {
    type: Number,
    required: true
  },
  max_price: {
    type: Number,
    required: true
  },
  modal_price: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    default: 'Quintal'
  },
  date: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true
})

// ─── Compound unique index: prevent duplicate entries for the same mandi+crop+date
mandiPriceSchema.index({ mandi: 1, crop: 1, date: 1 }, { unique: true })

// ─── Index for fast prediction queries (historical lookups per mandi+crop)
mandiPriceSchema.index({ mandi: 1, crop: 1, date: -1 })

module.exports = mongoose.model('MandiPrice', mandiPriceSchema)
