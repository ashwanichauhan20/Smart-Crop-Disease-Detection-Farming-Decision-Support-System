const SiteSettings = require('../models/SiteSettings');

// GET /api/admin/settings - returns the singleton settings doc
exports.getSettings = async (req, res) => {
    try {
        let settings = await SiteSettings.findOne({ _singleton: 'global' });
        if (!settings) {
            // Create default settings
            settings = await SiteSettings.create({ _singleton: 'global' });
        }
        res.json({ success: true, data: settings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// PUT /api/admin/settings - update any fields in the settings doc
exports.updateSettings = async (req, res) => {
    try {
        const settings = await SiteSettings.findOneAndUpdate(
            { _singleton: 'global' },
            req.body,
            { new: true, upsert: true, runValidators: false }
        );
        res.json({ success: true, data: settings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/admin/doc-proxy?url=<cloudinary_url>
// Proxy for fetching Cloudinary documents that return 401 when accessed directly
exports.docProxy = async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ success: false, message: 'url param is required' });

    try {
        let fetch;
        try {
            fetch = (await import('node-fetch')).default;
        } catch {
            fetch = global.fetch; // Node 18+ has built-in fetch
        }

        console.log(`[DocProxy] Attempting to fetch: ${url}`);

        const response = await fetch(url, { 
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Referer': 'https://res.cloudinary.com/'
            } 
        });
        
        if (!response.ok) {
            console.error(`[DocProxy] Upstream Error ${response.status}: ${url}`);
            return res.status(response.status).json({ 
                success: false, 
                message: `Upstream returned ${response.status}. Check if resource is public.` 
            });
        }

        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Robust streaming for different fetch implementations
        if (response.body && typeof response.body.pipe === 'function') {
            response.body.pipe(res);
        } else if (response.body && response.body.getReader) {
            // Web Streams API (Node 18+)
            const { Readable } = require('stream');
            const reader = response.body.getReader();
            const webStream = new ReadableStream({
                async start(controller) {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        controller.enqueue(value);
                    }
                    controller.close();
                }
            });
            Readable.from(webStream).pipe(res);
        } else {
            // Buffer fallback if streaming isn't perfectly supported
            const buffer = await response.arrayBuffer();
            res.send(Buffer.from(buffer));
        }
    } catch (err) {
        console.error('[DocProxy] Internal Error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};
// POST /api/admin/bulk-users
// Perform mass actions like delete all farmers or suspend all users
exports.bulkUserAction = async (req, res) => {
    const { action, role } = req.body;
    const User = require('../models/User');

    try {
        let query = {};
        if (role) query.role = role;

        if (action === 'delete') {
            await User.deleteMany(query);
            return res.json({ success: true, message: `All users matching ${JSON.stringify(query)} deleted.` });
        } else if (action === 'suspend') {
            await User.updateMany(query, { suspended: true });
            return res.json({ success: true, message: `All users matching ${JSON.stringify(query)} suspended.` });
        } else if (action === 'restore') {
            await User.updateMany(query, { suspended: false });
            return res.json({ success: true, message: `All users matching ${JSON.stringify(query)} restored.` });
        }

        res.status(400).json({ success: false, message: 'Invalid action' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
