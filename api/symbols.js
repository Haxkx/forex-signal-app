export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const symbols = [
    'GBP/CHF', 'EUR/JPY', 'EUR/GBP', 'USD/CHF', 'USD/CAD', 'GBP/AUD',
    'EUR/USD', 'EUR/CHF', 'EUR/CAD', 'EUR/AUD', 'CAD/JPY', 'AUD/CAD',
    'GBP/NZD', 'GBP/USD', 'GBP/CAD', 'AUD/JPY', 'AUD/USD', 'EUR/NZD',
    'USD/INR', 'USD/COP', 'USD/BDT', 'NZD/CAD', 'USD/BRL', 'USD/MXN',
    'NZD/JPY', 'USD/JPY', 'USD/DZD', 'USD/ZAR', 'NZD/USD', 'USD/PKR',
    'USD/NGN', 'USD/IDR', 'USD/TRY', 'USD/PHP', 'USD/EGP', 'USD/ARS',
    'NZD/CHF', 'AUD/NZD'
  ];

  const timeframes = [
    { value: '1m', label: '1 Minute' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '30m', label: '30 Minutes' },
    { value: '1h', label: '1 Hour' }
  ];

  res.json({
    success: true,
    symbols: symbols,
    timeframes: timeframes,
    lastUpdate: new Date().toISOString()
  });
}