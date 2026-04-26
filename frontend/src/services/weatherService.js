// Open-Meteo API doesn't need an API key!
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_API_URL = 'https://nominatim.openstreetmap.org/reverse';

// Helper to map WMO weather codes to OpenWeatherMap-like conditions and icon codes
const mapWmoCode = (code, isDay = true) => {
    const dOrN = isDay ? 'd' : 'n';
    switch (code) {
        case 0: return { condition: 'Clear', desc: 'Clear sky', icon: `01${dOrN}` };
        case 1: return { condition: 'Mainly Clear', desc: 'Mainly clear', icon: `02${dOrN}` };
        case 2: return { condition: 'Partly Cloudy', desc: 'Partly cloudy', icon: `03${dOrN}` };
        case 3: return { condition: 'Overcast', desc: 'Overcast', icon: `04${dOrN}` };
        case 45: case 48: return { condition: 'Fog', desc: 'Foggy', icon: `50${dOrN}` };
        case 51: case 53: case 55: return { condition: 'Drizzle', desc: 'Drizzle', icon: `09${dOrN}` };
        case 56: case 57: return { condition: 'Freezing Drizzle', desc: 'Freezing drizzle', icon: `09${dOrN}` };
        case 61: return { condition: 'Rain', desc: 'Slight rain', icon: `10${dOrN}` };
        case 63: return { condition: 'Rain', desc: 'Moderate rain', icon: `10${dOrN}` };
        case 65: return { condition: 'Rain', desc: 'Heavy rain', icon: `10${dOrN}` };
        case 66: case 67: return { condition: 'Freezing Rain', desc: 'Freezing rain', icon: `13${dOrN}` };
        case 71: case 73: case 75: case 77: return { condition: 'Snow', desc: 'Snow fall', icon: `13${dOrN}` };
        case 80: case 81: case 82: return { condition: 'Showers', desc: 'Rain showers', icon: `09${dOrN}` };
        case 85: case 86: return { condition: 'Snow Showers', desc: 'Snow showers', icon: `13${dOrN}` };
        case 95: return { condition: 'Thunderstorm', desc: 'Thunderstorm', icon: `11${dOrN}` };
        case 96: case 99: return { condition: 'Thunderstorm', desc: 'Thunderstorm with hail', icon: `11${dOrN}` };
        default: return { condition: 'Unknown', desc: 'Unknown', icon: `01${dOrN}` };
    }
};

export const fetchCurrentWeather = async (lat, lon) => {
    try {
        const res = await fetch(`${WEATHER_API_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day`);
        if (!res.ok) throw new Error('Weather data fetch failed');
        const data = await res.json();
        const current = data.current;

        let cityName = "Unknown Location";
        try {
            const locRes = await fetch(`${GEOCODE_API_URL}?lat=${lat}&lon=${lon}&format=json`);
            if (locRes.ok) {
                const locData = await locRes.json();
                cityName = locData.address?.city || locData.address?.town || locData.address?.village || locData.address?.county || locData.name || "Local Area";
            }
        } catch (e) {}

        const mappedWeather = mapWmoCode(current.weather_code, current.is_day === 1);

        return {
            name: cityName,
            main: {
                temp: current.temperature_2m,
                feels_like: current.apparent_temperature,
                humidity: current.relative_humidity_2m
            },
            wind: {
                speed: current.wind_speed_10m / 3.6
            },
            weather: [{
                main: mappedWeather.condition,
                description: mappedWeather.desc,
                icon: mappedWeather.icon
            }],
            visibility: 10000,
            rain: { '1h': current.precipitation }
        };
    } catch (error) {
        console.error('Error fetching current weather:', error);
        return null;
    }
};

export const fetchForecast = async (lat, lon) => {
    try {
        const res = await fetch(`${WEATHER_API_URL}?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`);
        if (!res.ok) throw new Error('Forecast fetch failed');
        const data = await res.json();
        
        const list = [];
        const daily = data.daily;
        if (!daily || !daily.time) return { list: [] };

        for (let i = 0; i < daily.time.length; i++) {
            const mappedWeather = mapWmoCode(daily.weather_code[i], true);
            list.push({
                dt_txt: `${daily.time[i]} 12:00:00`,
                dt: new Date(daily.time[i]).getTime() / 1000,
                main: {
                    temp_max: daily.temperature_2m_max[i],
                    temp_min: daily.temperature_2m_min[i]
                },
                weather: [{
                    icon: mappedWeather.icon
                }],
                pop: (daily.precipitation_probability_max[i] || 0) / 100
            });
        }

        return { list };
    } catch (error) {
        console.error('Error fetching forecast:', error);
        return null;
    }
};

export const getCropAdvisory = (temp, humidity, rain) => {
    const advisories = [];
    if (rain > 50) {
        advisories.push({ icon: '🌧️', crop: 'General', advice: 'Heavy rain expected. Ensure proper drainage in fields.', priority: 'high' });
    }
    if (temp > 35) {
        advisories.push({ icon: '☀️', crop: 'General', advice: 'High temperature alert. Increase irrigation frequency.', priority: 'medium' });
    }
    if (humidity > 80) {
        advisories.push({ icon: '💧', crop: 'General', advice: 'High humidity. Monitor for fungal diseases.', priority: 'medium' });
    }
    
    // Default advisory if none match
    if (advisories.length === 0) {
        advisories.push({ icon: '🌾', crop: 'General', advice: 'Ideal conditions for most crops. Continue regular monitoring.', priority: 'low' });
    }
    
    return advisories;
};
