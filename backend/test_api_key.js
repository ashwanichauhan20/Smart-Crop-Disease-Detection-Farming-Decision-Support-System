const axios = require('axios');

async function testKey() {
  const API_KEY = '579b464db66ec23bdd000001a8d9ddf0ff05405f6ecd44f89ed9e340';
  const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
  
  try {
    const url = `https://api.data.gov.in/resource/${RESOURCE_ID}`;
    const params = {
      'api-key': API_KEY,
      format: 'json',
      limit: 5
    };
    
    console.log('Testing API Key...');
    const response = await axios.get(url, { params });
    console.log('Success!');
    console.log('Records count:', response.data.records.length);
    console.log('Sample record:', JSON.stringify(response.data.records[0], null, 2));
  } catch (err) {
    console.error('API Key test failed:', err.response?.data || err.message);
  }
}

testKey();
