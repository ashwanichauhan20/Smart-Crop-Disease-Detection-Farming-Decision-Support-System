const ruleEngine = require('../services/ruleEngine');

// Helper to map WMO weather codes to conditions
const mapWmoCode = (code) => {
    if (code === 0) return { condition: 'Clear', desc: 'Clear sky' };
    if ([1,2,3].includes(code)) return { condition: 'Cloudy', desc: 'Partly cloudy' };
    if ([45,48].includes(code)) return { condition: 'Fog', desc: 'Foggy' };
    if ([51,53,55,56,57].includes(code)) return { condition: 'Drizzle', desc: 'Light Drizzle' };
    if ([61,63,65,66,67].includes(code)) return { condition: 'Rain', desc: 'Rain' };
    if ([71,73,75,77,85,86].includes(code)) return { condition: 'Snow', desc: 'Snow' };
    if ([80,81,82].includes(code)) return { condition: 'Showers', desc: 'Rain showers' };
    if ([95,96,99].includes(code)) return { condition: 'Thunderstorm', desc: 'Thunderstorm' };
    return { condition: 'Unknown', desc: 'Unknown' };
};

// Retry-enabled fetch helper (up to 2 retries)
async function fetchWithRetry(url, options = {}, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;
            if (attempt === retries) return response;
            console.warn(`⚠️ Fetch attempt ${attempt + 1} failed (status ${response.status}), retrying...`);
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        } catch (err) {
            if (attempt === retries) throw err;
            console.warn(`⚠️ Fetch attempt ${attempt + 1} threw: ${err.message}, retrying...`);
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
    }
}

// Default advisory shape to prevent crashes on rule engine errors
const defaultAdvisory = (crop, stage) => ({
    crop: crop || 'general',
    stage: stage || 'growing',
    cropImpact: ['✅ Weather conditions are stable. Continue with your regular farming schedule.'],
    expertAdvice: ['Monitor your crops regularly.', 'Morning is ideal for field scouting.'],
    actionPlan: [{ time: 'Ongoing', action: 'Regular field scouting and maintenance.' }],
    recommendations: []
});

exports.getWeatherDashboard = async (req, res) => {
    console.log(`🌤️ Weather Dashboard Request: lat=${req.query.lat}, lng=${req.query.lng}, crop=${req.query.crop}`);
    
    try {
        const { lat, lng, crop = 'general', stage = 'growing' } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ success: false, message: 'Latitude (lat) and Longitude (lng) are required.' });
        }

        // 1. Fetch Current & Forecast Weather from Open-Meteo (with auto-retry)
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
        
        console.log(`🔗 Fetching from Open-Meteo...`);
        const response = await fetchWithRetry(url, { headers: { 'User-Agent': 'Mozilla/5.0 Farming-App/1.0' } });
        
        if (!response || !response.ok) {
            const status = response ? response.status : 'no response';
            console.error(`❌ Open-Meteo failed with status: ${status}`);
            return res.status(502).json({ success: false, message: 'Weather provider is temporarily unavailable. Please try again in a moment.' });
        }

        const data = await response.json();
        
        if (!data || !data.current || !data.daily) {
            console.error('❌ Malformed weather data:', JSON.stringify(data).slice(0, 200));
            return res.status(502).json({ success: false, message: 'Received incomplete weather data. Please refresh again.' });
        }

        const currentMeteo = data.current;
        const mappedCurrent = mapWmoCode(currentMeteo.weather_code || 0);

        // 1b. Reverse geocode city name (soft failure — uses default on error)
        let cityName = "Local Area";
        try {
            const locRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
                headers: { 'User-Agent': 'Mozilla/5.0 Farming-App/1.0 (Smart Farming App)' },
                signal: AbortSignal.timeout(4000)
            });
            if (locRes.ok) {
                const locData = await locRes.json();
                cityName = locData.address?.city || locData.address?.town || locData.address?.village || locData.address?.district || locData.name || "Local Area";
            }
        } catch (e) {
            console.warn("⚠️ Geocoding failed or timed out:", e.message);
        }

        const currentWeather = {
            temp: currentMeteo.temperature_2m ?? 25,
            feels_like: currentMeteo.apparent_temperature ?? 25,
            humidity: currentMeteo.relative_humidity_2m ?? 50,
            rain_prob: (data.daily?.precipitation_probability_max && data.daily.precipitation_probability_max[0]) || 0,
            wind_speed: currentMeteo.wind_speed_10m ?? 0,
            condition: mappedCurrent.condition,
            desc: mappedCurrent.desc
        };

        // 2. Parse 7-Day Forecast
        const dailyMeteo = data.daily;
        const forecast7Days = [];
        const daysToProcess = Math.min(7, (dailyMeteo.time || []).length);
        for (let i = 0; i < daysToProcess; i++) {
            forecast7Days.push({
                date: dailyMeteo.time[i],
                temp_max: dailyMeteo.temperature_2m_max[i] ?? 0,
                temp_min: dailyMeteo.temperature_2m_min[i] ?? 0,
                rain_prob: (dailyMeteo.precipitation_probability_max && dailyMeteo.precipitation_probability_max[i]) || 0,
                desc: mapWmoCode(dailyMeteo.weather_code[i] ?? 0).desc
            });
        }

        // 3. Parse Hourly Data
        const hourlyMeteo = data.hourly || {};
        const hourlyForecast = [];
        const hoursToProcess = Math.min(168, (hourlyMeteo.time || []).length);
        for (let i = 0; i < hoursToProcess; i++) {
            hourlyForecast.push({
                time: hourlyMeteo.time[i],
                temp: hourlyMeteo.temperature_2m[i] ?? 0,
                rain_prob: hourlyMeteo.precipitation_probability[i] ?? 0
            });
        }

        // 4. Rule Engine (fully safe — uses defaults on any error)
        let smartAlerts = [{ type: 'Low', title: 'Favorable Conditions', message: 'Conditions are stable for farming.', icon: '🟢' }];
        let cropAdvisory = defaultAdvisory(crop, stage);
        let farmingPlan = [];

        try {
            const alerts = ruleEngine.generateSmartAlerts(currentWeather, hourlyForecast);
            if (Array.isArray(alerts) && alerts.length > 0) smartAlerts = alerts;

            const advisory = ruleEngine.getCropAdvisory(crop, stage, currentWeather, hourlyForecast);
            if (advisory && typeof advisory === 'object') {
                cropAdvisory = {
                    crop: advisory.crop || crop,
                    stage: advisory.stage || stage,
                    cropImpact: (Array.isArray(advisory.cropImpact) && advisory.cropImpact.length > 0)
                        ? advisory.cropImpact : defaultAdvisory(crop, stage).cropImpact,
                    expertAdvice: (Array.isArray(advisory.expertAdvice) && advisory.expertAdvice.length > 0)
                        ? advisory.expertAdvice : defaultAdvisory(crop, stage).expertAdvice,
                    actionPlan: Array.isArray(advisory.actionPlan) ? advisory.actionPlan : [],
                    recommendations: Array.isArray(advisory.recommendations) ? advisory.recommendations : []
                };
            }

            const plan = ruleEngine.generate7DayPlan(forecast7Days, crop, stage);
            if (Array.isArray(plan)) farmingPlan = plan;
        } catch (ruleErr) {
            console.error('❌ Rule Engine Error:', ruleErr.message);
            // Defaults already set — continue normally
        }

        // 5. Calculate Risk Level
        let overallRiskLevel = 'Low';
        if (smartAlerts.some(a => a.type === 'High')) overallRiskLevel = 'High';
        else if (smartAlerts.some(a => a.type === 'Medium')) overallRiskLevel = 'Medium';

        console.log('✅ Weather Dashboard response ready.');
        return res.json({
            success: true,
            data: {
                location: { lat: parseFloat(lat), lng: parseFloat(lng), city: cityName },
                current_weather: currentWeather,
                risk_level: overallRiskLevel,
                alerts: smartAlerts,
                advisory: cropAdvisory,
                forecast: forecast7Days,
                hourly_forecast: hourlyForecast,
                farming_plan: farmingPlan
            }
        });

    } catch (error) {
        console.error('❌ CRITICAL Weather Dashboard Error:', error.stack);
        res.status(500).json({ 
            success: false, 
            message: 'Unable to load weather data. Please check your connection and try again.' 
        });
    }
};
