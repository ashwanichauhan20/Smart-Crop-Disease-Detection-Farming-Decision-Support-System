/**
 * Phase 1 Rule Engine - Hardcoded Expert Rules for Weather Advisory
 * This generates Smart Alerts, Crop-Specific rules, and the 7-Day Plan.
 */

// 1. SMART ALERTS (Based purely on weather logic)
function generateSmartAlerts(currentWeather, hourlyForecast = []) {
  const alerts = [];
  const temp = currentWeather.temp;
  const rain = currentWeather.rain_prob; // percentage
  const wind = currentWeather.wind_speed; // km/h
  const humidity = currentWeather.humidity;

  if (temp > 40) {
    alerts.push({ type: 'High', title: 'Heatwave Alert', message: 'Extreme temperatures detected. Increase irrigation frequency and avoid spraying chemicals.', icon: '🔥' });
  } else if (temp < 5) {
    alerts.push({ type: 'High', title: 'Frost Warning', message: 'Temperatures dropping significantly. Protect sensitive crops from frostbite.', icon: '❄️' });
  }

  let maxRainProb24h = 0;
  if(hourlyForecast.length > 0) {
      maxRainProb24h = Math.max(...hourlyForecast.map(h => h.rain_prob));
  }

  if (rain > 70 || maxRainProb24h > 70) {
    alerts.push({ type: 'Medium', title: 'Heavy Rain Expected Soon', message: `High probability of rain (${maxRainProb24h > rain ? maxRainProb24h : rain}%) rolling in over the next 24 hours. Halt irrigation and check field drainage trenches immediately.`, icon: '🌧️' });
  }

  if (wind > 50) {
    alerts.push({ type: 'High', title: 'Storm Warning', message: 'High wind speeds detected. Secure tall crops and farm equipment.', icon: '🌪️' });
  }

  if (humidity > 85 && temp >= 25 && temp <= 32) {
    alerts.push({ type: 'Medium', title: 'Fungal Disease Risk', message: 'Humid and warm conditions are ideal for fungal growth. Monitor crops closely.', icon: '🍄' });
  }

  if (alerts.length === 0) {
    alerts.push({ type: 'Low', title: 'Favorable Conditions', message: 'Weather conditions are optimal. Continue standard farming operations.', icon: '🟢' });
  }

  return alerts;
}

// 2. CROP-BASED ADVISORY
function getCropAdvisory(crop, stage, weather, hourlyForecast = []) {
  crop = crop ? crop.toLowerCase() : 'general';
  stage = stage ? stage.toLowerCase() : 'growing';
  
  const temp = weather.temp;
  const rain = weather.rain_prob;

  let imminentRain = false;
  let maxRainProb = 0;
  if (hourlyForecast.length > 0) {
      maxRainProb = Math.max(...hourlyForecast.map(h => h.rain_prob));
      imminentRain = maxRainProb > 50;
  }
  
  let advisory = {
    crop: crop,
    stage: stage,
    cropImpact: [],
    expertAdvice: [],
    actionPlan: []
  };

  // Combine multiple conditions securely (No ML, No Dataset)
  if (crop === 'wheat') {
    if (stage === 'harvest' && imminentRain) {
      advisory.cropImpact.push(`🔴 Heavy rain (${maxRainProb}%) will severely damage harvest-ready wheat grains.`);
      advisory.expertAdvice.push("🛑 DO NOT start harvesting right now.");
      advisory.expertAdvice.push("Move already harvested grains to a dry storage shed immediately.");
      advisory.actionPlan.push({ time: "Today", action: "Cover harvested grains with tarpaulin." });
      advisory.actionPlan.push({ time: "Next 2 Days", action: "Wait for dry weather before resuming harvest." });
    } else if (temp > 35) {
      advisory.cropImpact.push("⚠️ High temperatures cause Terminal Heat Stress, leading to shriveled wheat grains.");
      advisory.expertAdvice.push("Ensure adequate soil moisture to mitigate heat stress.");
      advisory.actionPlan.push({ time: "Today", action: "Apply light irrigation in the evening." });
    } else if (stage === 'sowing' && temp > 25) {
      advisory.cropImpact.push("ℹ️ Current temperatures are unseasonably warm for wheat sowing.");
      advisory.expertAdvice.push("Ideal sowing temperature for wheat is 20-25°C. Delay sowing.");
      advisory.actionPlan.push({ time: "This Week", action: "Wait for weather to cool off before sowing seeds." });
    }
  } 
  else if (crop === 'rice' || crop === 'paddy') {
    if (rain < 20 && temp > 30 && stage !== 'harvest' && !imminentRain) {
      advisory.cropImpact.push("⚠️ Low rainfall and high heat detected. Water stress can stunt tiller growth.");
      advisory.expertAdvice.push("Ensure standing water (2-5cm) in fields immediately.");
      advisory.actionPlan.push({ time: "Today", action: "Irrigate field to maintain water level." });
    }
    else if (stage === 'harvest' && imminentRain) {
      advisory.cropImpact.push(`🔴 Rain (${maxRainProb}% prob) will cause grain spoilage during harvest.`);
      advisory.expertAdvice.push("Delay harvesting by 2-3 days until the weather clears up.");
      advisory.actionPlan.push({ time: "Next 48 Hrs", action: "Halt harvest operations completely." });
    }
    else if (stage === 'harvest' && !imminentRain) {
      advisory.cropImpact.push("ℹ️ Clear skies provide optimal conditions for uniform ripening.");
      advisory.expertAdvice.push("You can safely proceed with harvesting.");
      advisory.actionPlan.push({ time: "Today", action: "Drain water from the field if not already done." });
      advisory.actionPlan.push({ time: "Next Few Days", action: "Begin systematic harvesting." });
    }
  } 
  else if (crop === 'potato') {
    if (weather.humidity > 80 && imminentRain) {
      advisory.cropImpact.push("🔴 High humidity + Rain drastically increases the risk of Late Blight fungal disease.");
      advisory.expertAdvice.push("Delay chemical spraying until rain passes.");
      advisory.expertAdvice.push("Apply preventive fungicides (like Mancozeb) once leaves are dry.");
      advisory.actionPlan.push({ time: "Today", action: "Inspect lower leaves for blight spots." });
      advisory.actionPlan.push({ time: "After Rain", action: "Schedule preventive fungicide spray." });
    }
    else if (imminentRain) {
      advisory.cropImpact.push(`⚠️ Heavy rain incoming (${maxRainProb}%). Potatoes rot rapidly in stagnant water (Water logging).`);
      advisory.expertAdvice.push("Clear drainage channels today to prevent water accumulation.");
      advisory.actionPlan.push({ time: "Today", action: "Dig or clear field trenches." });
    }
  }
  else if (crop === 'cotton') {
    if (imminentRain && stage === 'harvest') {
      advisory.cropImpact.push(`🔴 Incoming rain (${maxRainProb}%) destroys quality of open cotton bolls.`);
      advisory.expertAdvice.push("Pick any mature bolls immediately before the rain starts.");
      advisory.actionPlan.push({ time: "Today", action: "Deploy extra labor to pick open bolls quickly." });
    }
  }

  // Fallback (Simple Expert Tips) if no specific rules hit
  if (advisory.cropImpact.length === 0) {
      if (imminentRain) {
           advisory.cropImpact.push(`🌧️ Expected rain (${maxRainProb}%) will wash away applied chemicals or damage harvest.`);
           advisory.expertAdvice.push("Avoid spraying fertilizers or pesticides.");
           if (stage === 'harvest') {
               advisory.expertAdvice.push("Halt harvesting operations.");
           } else {
               advisory.expertAdvice.push("Ensure proper drainage in the field.");
           }
           advisory.actionPlan.push({ time: "Today", action: "Suspend chemical spraying." });
           advisory.actionPlan.push({ time: "Next 2 Days", action: "Monitor field drainage." });
      } else {
           advisory.cropImpact.push(`✅ Weather is stable for ${crop}. Growth should proceed normally.`);
           advisory.expertAdvice.push("Morning is best for harvesting or spraying.");
           advisory.expertAdvice.push(`Proceed with standard care and maintenance for the ${stage} stage.`);
           advisory.actionPlan.push({ time: "Ongoing", action: "Regular field scouting." });
      }
  }

  return advisory;
}

// 3. 7-DAY FARMING PLAN
function generate7DayPlan(dailyForecast, crop, stage) {
  const plan = [];
  
  dailyForecast.forEach((dayWeather, index) => {
    let action = "Standard Maintenance";
    let icon = "✅";
    let status = "ongoing"; // ongoing, warning, critical
    
    if (dayWeather.rain_prob > 60) {
      action = "Rain expected. Do NOT irrigate or spray chemicals. Ensure drainage.";
      icon = "⛔";
      status = "warning";
    } else if (dayWeather.temp_max > 38) {
      action = "Heat stress risk. Irrigate lightly in the evening.";
      icon = "💧";
      status = "warning";
    } else {
      if (index === 0) {
        action = stage === 'harvest' ? "Ideal day to begin harvesting." : "Good day for fertilizer/pesticide application if needed.";
        icon = "🚜";
        status = "ongoing";
      } else if (index === 3) {
         action = "Field scouting. Check for pest/disease incidence.";
         icon = "🔍";
      } else if (index === 6) {
         action = stage === 'sowing' ? "Monitor seed germination rates." : "Evaluate soil moisture and schedule next irrigation.";
         icon = "🌱";
      }
    }

    plan.push({
      day: index + 1,
      date: dayWeather.date,
      weatherDesc: dayWeather.desc,
      icon: icon,
      action: action,
      status: status
    });
  });

  return plan;
}

module.exports = {
  generateSmartAlerts,
  getCropAdvisory,
  generate7DayPlan
};
