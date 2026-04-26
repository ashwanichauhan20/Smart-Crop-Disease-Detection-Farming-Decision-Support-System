const weatherController = require('./controllers/weatherController');

const req = {
  query: {
    lat: '19.9975',
    lng: '73.7898',
    crop: 'wheat',
    stage: 'growing'
  }
};
const res = {
  json: function(data) { console.log("SUCCESS:", JSON.stringify(data, null, 2)); },
  status: function(code) { 
    console.log("STATUS:", code); 
    return this; 
  }
};

weatherController.getWeatherDashboard(req, res).catch(console.error);
