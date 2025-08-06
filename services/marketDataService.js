const axios = require('axios');

class MarketDataService {
  constructor() {
    this.alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
    this.finnhubKey = process.env.FINNHUB_API_KEY;
    
    // Mock data for demonstration (replace with real API calls)
    this.mockStocks = [
      { symbol: 'BBCA', name: 'Bank Central Asia Tbk', sector: 'Banking' },
      { symbol: 'BBRI', name: 'Bank Rakyat Indonesia Tbk', sector: 'Banking' },
      { symbol: 'ASII', name: 'Astra International Tbk', sector: 'Automotive' },
      { symbol: 'TLKM', name: 'Telkom Indonesia Tbk', sector: 'Telecommunications' },
      { symbol: 'ICBP', name: 'Indofood CBP Sukses Makmur Tbk', sector: 'Consumer Goods' },
      { symbol: 'UNVR', name: 'Unilever Indonesia Tbk', sector: 'Consumer Goods' },
      { symbol: 'PGAS', name: 'Perusahaan Gas Negara Tbk', sector: 'Energy' },
      { symbol: 'KLBF', name: 'Kalbe Farma Tbk', sector: 'Healthcare' },
      { symbol: 'SMGR', name: 'Semen Indonesia Tbk', sector: 'Basic Materials' },
      { symbol: 'INDF', name: 'Indofood Sukses Makmur Tbk', sector: 'Consumer Goods' }
    ];
  }

  async getAvailableStocks() {
    try {
      // In real implementation, fetch from API
      return this.mockStocks;
    } catch (error) {
      console.error('Error fetching available stocks:', error);
      return this.mockStocks; // Fallback to mock data
    }
  }

  async getStockData(symbol) {
    try {
      // Try to get real data first
      if (this.alphaVantageKey) {
        const data = await this.getAlphaVantageData(symbol);
        if (data) return data;
      }

      if (this.finnhubKey) {
        const data = await this.getFinnhubData(symbol);
        if (data) return data;
      }

      // Fallback to mock data
      return await this.getMockStockData(symbol);
    } catch (error) {
      console.error(`Error fetching stock data for ${symbol}:`, error);
      return await this.getMockStockData(symbol);
    }
  }

  async getAlphaVantageData(symbol) {
    try {
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}.JK&apikey=${this.alphaVantageKey}`
      );

      if (response.data['Global Quote']) {
        const quote = response.data['Global Quote'];
        const lastPrice = parseFloat(quote['05. price']);
        const change = parseFloat(quote['09. change']);
        
        // Validate that we have valid data
        if (isNaN(lastPrice) || isNaN(change)) {
          console.log('Invalid data from Alpha Vantage, using mock data');
          return null;
        }
        
        return {
          symbol: quote['01. symbol'],
          lastPrice: lastPrice,
          change: change,
          changePercent: quote['10. change percent'],
          volume: parseInt(quote['06. volume']) || 0,
          high: parseFloat(quote['03. high']) || lastPrice,
          low: parseFloat(quote['04. low']) || lastPrice,
          open: parseFloat(quote['02. open']) || lastPrice,
          previousClose: parseFloat(quote['08. previous close']) || (lastPrice - change),
          timestamp: new Date().toISOString()
        };
      }
      return null;
    } catch (error) {
      console.error('Alpha Vantage API error:', error);
      return null;
    }
  }

  async getFinnhubData(symbol) {
    try {
      const response = await axios.get(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}.JK&token=${this.finnhubKey}`
      );

      if (response.data) {
        const data = response.data;
        return {
          symbol: symbol,
          lastPrice: data.c,
          change: data.d,
          changePercent: data.dp,
          high: data.h,
          low: data.l,
          open: data.o,
          previousClose: data.pc,
          volume: 0, // Finnhub doesn't provide volume in quote endpoint
          timestamp: new Date().toISOString()
        };
      }
      return null;
    } catch (error) {
      console.error('Finnhub API error:', error);
      return null;
    }
  }

  async getMockStockData(symbol) {
    // Generate realistic mock data
    const basePrice = 1000 + Math.random() * 9000;
    const change = (Math.random() - 0.5) * 200;
    const changePercent = (change / basePrice) * 100;
    const volume = Math.floor(Math.random() * 1000000) + 100000;
    const high = basePrice + Math.random() * 100;
    const low = basePrice - Math.random() * 100;
    const open = basePrice + (Math.random() - 0.5) * 50;

    return {
      symbol: symbol,
      lastPrice: Math.round(basePrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: volume,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      open: Math.round(open * 100) / 100,
      previousClose: Math.round((basePrice - change) * 100) / 100,
      timestamp: new Date().toISOString()
    };
  }

  async getOrderBook(symbol) {
    try {
      // Mock order book data
      const basePrice = 1000 + Math.random() * 9000;
      const spread = basePrice * 0.001; // 0.1% spread

      const bids = [];
      const asks = [];

      // Generate bid orders
      for (let i = 0; i < 10; i++) {
        const price = basePrice - (i * spread) - (Math.random() * spread);
        const quantity = Math.floor(Math.random() * 10000) + 1000;
        bids.push({
          price: Math.round(price * 100) / 100,
          quantity: quantity,
          total: Math.round(price * quantity * 100) / 100
        });
      }

      // Generate ask orders
      for (let i = 0; i < 10; i++) {
        const price = basePrice + (i * spread) + (Math.random() * spread);
        const quantity = Math.floor(Math.random() * 10000) + 1000;
        asks.push({
          price: Math.round(price * 100) / 100,
          quantity: quantity,
          total: Math.round(price * quantity * 100) / 100
        });
      }

      return {
        symbol: symbol,
        timestamp: new Date().toISOString(),
        bids: bids.sort((a, b) => b.price - a.price), // Sort bids descending
        asks: asks.sort((a, b) => a.price - b.price), // Sort asks ascending
        spread: Math.round(spread * 100) / 100,
        spreadPercent: Math.round((spread / basePrice) * 10000) / 100 // Basis points
      };
    } catch (error) {
      console.error(`Error fetching order book for ${symbol}:`, error);
      return {
        symbol: symbol,
        timestamp: new Date().toISOString(),
        bids: [],
        asks: [],
        spread: 0,
        spreadPercent: 0
      };
    }
  }

  async getHistoricalData(symbol, timeframe = '1d', period = '1mo') {
    try {
      // Mock historical data
      const data = [];
      const basePrice = 1000 + Math.random() * 9000;
      const now = new Date();
      
      for (let i = 30; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        const open = basePrice + (Math.random() - 0.5) * 100;
        const high = open + Math.random() * 50;
        const low = open - Math.random() * 50;
        const close = low + Math.random() * (high - low);
        const volume = Math.floor(Math.random() * 1000000) + 100000;

        data.push({
          date: date.toISOString().split('T')[0],
          open: Math.round(open * 100) / 100,
          high: Math.round(high * 100) / 100,
          low: Math.round(low * 100) / 100,
          close: Math.round(close * 100) / 100,
          volume: volume
        });
      }

      return data;
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      return [];
    }
  }

  async getMarketOverview() {
    try {
      // Mock market overview
      const indices = [
        { name: 'IHSG', value: 7200 + Math.random() * 200, change: (Math.random() - 0.5) * 50 },
        { name: 'LQ45', value: 950 + Math.random() * 50, change: (Math.random() - 0.5) * 10 },
        { name: 'IDX30', value: 650 + Math.random() * 30, change: (Math.random() - 0.5) * 8 }
      ];

      return {
        timestamp: new Date().toISOString(),
        indices: indices.map(index => ({
          ...index,
          changePercent: Math.round((index.change / index.value) * 10000) / 100
        })),
        marketStatus: 'OPEN',
        totalVolume: Math.floor(Math.random() * 1000000000) + 1000000000,
        gainers: Math.floor(Math.random() * 200) + 100,
        losers: Math.floor(Math.random() * 200) + 100
      };
    } catch (error) {
      console.error('Error fetching market overview:', error);
      return {
        timestamp: new Date().toISOString(),
        indices: [],
        marketStatus: 'UNKNOWN',
        totalVolume: 0,
        gainers: 0,
        losers: 0
      };
    }
  }
}

module.exports = { MarketDataService };