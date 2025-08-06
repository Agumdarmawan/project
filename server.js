const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import custom modules
const { GeminiAI } = require('./services/geminiAI');
const { MarketDataService } = require('./services/marketDataService');
const { TechnicalAnalysis } = require('./services/technicalAnalysis');
const { TradingAnalysis } = require('./services/tradingAnalysis');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS and body parsing
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize services
let geminiAI;
try {
  geminiAI = new GeminiAI(process.env.GEMINI_API_KEY);
} catch (error) {
  console.warn('Warning: Gemini AI not initialized. Using mock AI analysis.');
  geminiAI = null;
}

const marketDataService = new MarketDataService();
const technicalAnalysis = new TechnicalAnalysis();
const tradingAnalysis = new TradingAnalysis(geminiAI, technicalAnalysis);

// Store connected clients and their subscriptions
const connectedClients = new Map();

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/stocks', async (req, res) => {
  try {
    const stocks = await marketDataService.getAvailableStocks();
    res.json(stocks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stock/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const stockData = await marketDataService.getStockData(symbol);
    res.json(stockData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analysis/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const analysis = await tradingAnalysis.getAnalysis(symbol);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orderbook/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const orderbook = await marketDataService.getOrderBook(symbol);
    res.json(orderbook);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Store client connection
  connectedClients.set(socket.id, {
    socket,
    subscriptions: new Set()
  });

  // Handle stock subscription
  socket.on('subscribe', async (data) => {
    const { symbol } = data;
    const client = connectedClients.get(socket.id);
    
    if (client) {
      client.subscriptions.add(symbol);
      console.log(`Client ${socket.id} subscribed to ${symbol}`);
      
      // Send initial data
      try {
        const stockData = await marketDataService.getStockData(symbol);
        const analysis = await tradingAnalysis.getAnalysis(symbol);
        
        socket.emit('stockData', {
          symbol,
          data: stockData,
          analysis
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    }
  });

  // Handle unsubscribe
  socket.on('unsubscribe', (data) => {
    const { symbol } = data;
    const client = connectedClients.get(socket.id);
    
    if (client) {
      client.subscriptions.delete(symbol);
      console.log(`Client ${socket.id} unsubscribed from ${symbol}`);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    connectedClients.delete(socket.id);
  });
});

// Real-time data updates
const updateInterval = setInterval(async () => {
  for (const [clientId, client] of connectedClients) {
    for (const symbol of client.subscriptions) {
      try {
        const stockData = await marketDataService.getStockData(symbol);
        const analysis = await tradingAnalysis.getAnalysis(symbol);
        
        client.socket.emit('stockData', {
          symbol,
          data: stockData,
          analysis,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Error updating data for ${symbol}:`, error);
      }
    }
  }
}, 5000); // Update every 5 seconds

// Cleanup on server shutdown
process.on('SIGINT', () => {
  clearInterval(updateInterval);
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
});