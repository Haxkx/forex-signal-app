const axios = require('axios');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { symbol, timeframe = '1h' } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol parameter is required' });
  }

  try {
    const yahooSymbol = symbol.replace('/', '') + '=X';
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${timeframe}&range=1d`;
    
    console.log('Fetching Yahoo data for:', yahooSymbol);
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const data = response.data;

    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      return res.status(404).json({ 
        error: 'No data found for symbol',
        symbol: symbol
      });
    }

    const result = data.chart.result[0];
    const quotes = result.indicators.quote[0];
    const timestamps = result.timestamp;
    
    const candles = timestamps.map((timestamp, index) => ({
      time: timestamp * 1000,
      open: quotes.open[index],
      high: quotes.high[index], 
      low: quotes.low[index],
      close: quotes.close[index],
      volume: quotes.volume[index]
    })).filter(candle => 
      candle.open && candle.high && candle.low && candle.close
    );

    const responseData = {
      success: true,
      symbol: symbol,
      timeframe: timeframe,
      source: 'yahoo',
      candles: candles,
      lastUpdate: new Date().toISOString()
    };

    res.json(responseData);

  } catch (error) {
    console.error('Yahoo API Error:', error.message);
    
    res.status(500).json({
      error: 'Failed to fetch data from Yahoo Finance',
      message: error.message
    });
  }
};
    console.log('Fetching Yahoo data for:', yahooSymbol, 'with timeframe:', interval);
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const data = response.data;

    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      return res.status(404).json({ 
        error: 'No data found for symbol',
        symbol: symbol,
        yahooSymbol: yahooSymbol
      });
    }

    const result = data.chart.result[0];
    const quotes = result.indicators.quote[0];
    const timestamps = result.timestamp;
    
    // Process candle data
    const candles = timestamps.map((timestamp, index) => ({
      time: timestamp * 1000, // Convert to milliseconds
      open: quotes.open[index],
      high: quotes.high[index], 
      low: quotes.low[index],
      close: quotes.close[index],
      volume: quotes.volume[index]
    })).filter(candle => 
      candle.open && candle.high && candle.low && candle.close
    );

    const responseData = {
      success: true,
      symbol: symbol,
      timeframe: timeframe,
      source: 'yahoo',
      meta: {
        currency: result.meta.currency,
        exchange: result.meta.exchangeName,
        instrumentType: result.meta.instrumentType
      },
      candles: candles,
      lastUpdate: new Date().toISOString()
    };

    res.json(responseData);

  } catch (error) {
    console.error('Yahoo API Error:', error.message);
    
    res.status(500).json({
      error: 'Failed to fetch data from Yahoo Finance',
      message: error.message,
      symbol: symbol,
      timeframe: timeframe
    });
  }
}
