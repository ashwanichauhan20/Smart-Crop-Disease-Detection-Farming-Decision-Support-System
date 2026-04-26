const Scheme = require('../models/Scheme');

// Fallback data to sync from "central portal"
const CENTRAL_SCHEMES = [
    { name: 'Pradhan Mantri Krishi Sinchayee Yojana', category: 'Infrastructure', description: 'Irrigation coverage and improving water use efficiency.', eligibility: 'All farmers.', benefit: 'Subsidies on drip/sprinkler systems', deadline: 'Ongoing', ministry: 'Ministry of Agriculture', icon: '💧', color: '#0288d1', featured: true, applyUrl: 'https://pmksy.gov.in' },
    { name: 'Paramparagat Krishi Vikas Yojana', category: 'Subsidies', description: 'Promotes commercial organic production through certified organic farming.', eligibility: 'Groups of farmers (50+ acres).', benefit: '₹50,000 per hectare for 3 years', deadline: 'Ongoing', ministry: 'Ministry of Agriculture', icon: '🌿', color: '#388e3c', featured: false, applyUrl: 'https://vikaspedia.in/agriculture/pkvy' },
    { name: 'Agriculture Infrastructure Fund', category: 'Credit', description: 'Financing facility for post-harvest management infrastructure.', eligibility: 'FPOs, Startups, Farmers.', benefit: '3% interest subvention', deadline: 'March 2032', ministry: 'Ministry of Agriculture', icon: '🏭', color: '#f57c00', featured: false, applyUrl: 'https://agriinfra.dac.gov.in' },
    { name: 'PM-KISAN Samman Nidhi', category: 'Income Support', description: 'Direct income support of ₹6,000 per year to vulnerable landholding farmer families.', eligibility: 'Small & marginal farmers.', benefit: '₹6,000/year', deadline: 'Ongoing', ministry: 'Ministry of Agriculture', icon: '💰', color: '#2e7d32', featured: true, applyUrl: 'https://pmkisan.gov.in' },
];

exports.getSchemes = async (req, res) => {
    try {
        const schemes = await Scheme.find().sort({ featured: -1, createdAt: -1 });
        res.json({ success: true, data: schemes });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.addScheme = async (req, res) => {
    try {
        const scheme = new Scheme(req.body);
        const saved = await scheme.save();
        res.status(201).json({ success: true, data: saved });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateScheme = async (req, res) => {
    try {
        const updated = await Scheme.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Scheme not found' });
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteScheme = async (req, res) => {
    try {
        await Scheme.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Scheme deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.syncSchemes = async (req, res) => {
    try {
        let addedCount = 0;
        for (const remote of CENTRAL_SCHEMES) {
            const exists = await Scheme.findOne({ name: { $regex: new RegExp(remote.name, 'i') } });
            if (!exists) {
                await Scheme.create(remote);
                addedCount++;
            }
        }
        const allSchemes = await Scheme.find().sort({ featured: -1, createdAt: -1 });
        res.json({ success: true, added: addedCount, data: allSchemes });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
