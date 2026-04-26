const mongoose = require('mongoose');

const schemeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, default: 'Income Support' },
    description: { type: String },
    eligibility: { type: String },
    benefit: { type: String },
    deadline: { type: String },
    ministry: { type: String },
    icon: { type: String, default: '📜' },
    color: { type: String, default: '#1565C0' },
    featured: { type: Boolean, default: false },
    applyUrl: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Scheme', schemeSchema);
