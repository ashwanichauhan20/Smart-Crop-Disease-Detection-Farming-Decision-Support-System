const mongoose = require('mongoose');

// Singleton settings document for the entire site
const siteSettingsSchema = new mongoose.Schema({
    _singleton: { type: String, default: 'global', unique: true }, // ensures only one doc
    announcement: { type: String, default: '' },
    maintenanceMode: { type: Boolean, default: false },
    allowRegistration: { type: Boolean, default: true },
    expertAutoApprove: { type: Boolean, default: false },
    siteContent: {
        homeTitle: { type: String, default: '' },
        homeSubtitle: { type: String, default: '' },
        homeTagline: { type: String, default: '' },
        homeDesc: { type: String, default: '' },
        contactEmail: { type: String, default: '' },
        contactPhone: { type: String, default: '' },
    },
    communityWidgets: {
        trending: { type: Array, default: [] },
        experts: { type: Array, default: [] },
        stats: { type: Array, default: [] },
    },
}, { timestamps: true });

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
