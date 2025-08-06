# AI Trading Analysis - Website Analisis Saham Berbasis AI

Website analisis trading saham yang menggunakan AI Gemini untuk memberikan rekomendasi trading real-time dengan fokus pada teknikal analisis untuk scalping.

## 🚀 Fitur Utama

### 📊 Analisis Real-time
- **Data Pasar Real-time**: Harga, volume, perubahan, high/low, open/close
- **Order Book**: Depth of market dengan bid/ask spread
- **Indikator Teknikal**: RSI, MACD, Stochastic, Bollinger Bands, VWAP, ATR
- **Support & Resistance**: Deteksi level support dan resistance otomatis

### 🤖 AI Analysis dengan Gemini
- **Sentiment Analysis**: Analisis sentiment bullish/bearish/neutral
- **Confidence Level**: Tingkat kepercayaan AI dalam rekomendasi
- **Trading Recommendations**: Entry, Take Profit, Stop Loss otomatis
- **Risk Management**: Perhitungan risk/reward ratio dan position sizing

### 📈 Chart & Visualisasi
- **Interactive Charts**: Candlestick chart dengan volume
- **Multiple Timeframes**: 1m, 5m, 15m, 1h, 1d
- **Technical Indicators**: Overlay indikator pada chart
- **Real-time Updates**: Update data setiap 5 detik

### 🔔 Real-time Signals
- **Trading Signals**: Sinyal buy/sell berdasarkan analisis AI dan teknikal
- **Alert System**: Notifikasi real-time untuk perubahan signifikan
- **Signal History**: Riwayat sinyal trading

### 📱 Responsive Design
- **Mobile Friendly**: Optimized untuk desktop, tablet, dan mobile
- **Modern UI**: Dark theme dengan gradient design
- **Real-time Connection**: Status koneksi WebSocket

## 🛠️ Teknologi yang Digunakan

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **Socket.IO**: Real-time communication
- **Google Gemini AI**: AI analysis engine
- **Technical Indicators**: Library untuk perhitungan indikator

### Frontend
- **Vanilla JavaScript**: ES6+ modern JavaScript
- **Lightweight Charts**: Trading chart library
- **Socket.IO Client**: Real-time data streaming
- **CSS3**: Modern styling dengan Grid dan Flexbox

### APIs & Services
- **Alpha Vantage**: Market data API (optional)
- **Finnhub**: Alternative market data API (optional)
- **Google Gemini**: AI analysis API

## 📦 Instalasi

### Prerequisites
- Node.js (v16 atau lebih baru)
- npm atau yarn
- Google Gemini API key

### 1. Clone Repository
```bash
git clone <repository-url>
cd ai-trading-analysis
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
```bash
cp .env.example .env
```

Edit file `.env` dan isi dengan API keys Anda:
```env
# Gemini AI API Key (Required)
GEMINI_API_KEY=your_gemini_api_key_here

# Market Data API Keys (Optional - untuk data real)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here
FINNHUB_API_KEY=your_finnhub_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 4. Get API Keys

#### Google Gemini API
1. Kunjungi [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Buat project baru atau pilih existing project
3. Generate API key
4. Copy API key ke file `.env`

#### Market Data APIs (Optional)
- **Alpha Vantage**: [Daftar di sini](https://www.alphavantage.co/support/#api-key)
- **Finnhub**: [Daftar di sini](https://finnhub.io/register)

### 5. Run Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

Aplikasi akan berjalan di `http://localhost:3000`

## 🎯 Cara Penggunaan

### 1. Dashboard Overview
- **Market Indices**: Lihat pergerakan IHSG, LQ45, IDX30
- **Stock Search**: Cari saham dengan symbol atau pilih dari daftar populer
- **Real-time Status**: Monitor status koneksi dan pasar

### 2. Chart Analysis
- **Timeframe Selection**: Pilih timeframe 1m, 5m, 15m, 1h, 1d
- **Interactive Chart**: Zoom, pan, dan hover untuk detail
- **Volume Analysis**: Lihat volume trading di bawah chart

### 3. AI Analysis Panel
- **Sentiment Badge**: Lihat sentiment AI (Bullish/Bearish/Neutral)
- **Confidence Meter**: Tingkat kepercayaan AI dalam rekomendasi
- **Trading Levels**: Entry, Take Profit, Stop Loss otomatis
- **Risk Metrics**: Risk/reward ratio dan risk level

### 4. Technical Indicators
- **RSI**: Relative Strength Index dengan sinyal oversold/overbought
- **MACD**: Moving Average Convergence Divergence
- **Stochastic**: Stochastic oscillator
- **Bollinger Bands**: Position dalam band

### 5. Market Data
- **Price Information**: Last price, change, volume
- **OHLC Data**: Open, High, Low, Close
- **Real-time Updates**: Update otomatis setiap 5 detik

### 6. Order Book
- **Bid/Ask Spread**: Lihat spread dan depth
- **Market Depth**: 10 level bid dan ask
- **Liquidity Analysis**: Analisis likuiditas pasar

### 7. Real-time Signals
- **Trading Signals**: Sinyal buy/sell berdasarkan analisis
- **Signal History**: Riwayat sinyal dengan timestamp
- **Clear Signals**: Hapus sinyal lama

## 🔧 Konfigurasi

### Settings Modal
- **Gemini API Key**: Update API key jika diperlukan
- **Update Interval**: Atur interval update data (1-60 detik)
- **Risk Tolerance**: Pilih level risiko (Low/Medium/High)

### Customization
- **Stock List**: Edit daftar saham di `services/marketDataService.js`
- **Indicators**: Tambah indikator baru di `services/technicalAnalysis.js`
- **AI Prompts**: Customize prompt AI di `services/geminiAI.js`

## 📊 Struktur Data

### Stock Data Format
```javascript
{
  symbol: "BBCA",
  lastPrice: 9850,
  change: 150,
  changePercent: 1.55,
  volume: 2345678,
  high: 9950,
  low: 9750,
  open: 9800,
  previousClose: 9700,
  timestamp: "2024-01-01T10:00:00.000Z"
}
```

### AI Analysis Format
```javascript
{
  sentiment: "BULLISH",
  confidence: 75,
  analysis: "Analisis AI menunjukkan...",
  recommendation: {
    action: "BUY",
    entry_price: 9850,
    take_profit: 10150,
    stop_loss: 9650,
    timeframe: "5m",
    risk_reward_ratio: "1:2"
  }
}
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Gemini API Error
```
Error: Gemini API key is required
```
**Solution**: Pastikan API key sudah diisi di file `.env`

#### 2. WebSocket Connection Failed
```
WebSocket connection failed
```
**Solution**: 
- Pastikan server berjalan
- Check firewall settings
- Restart server

#### 3. Chart Not Loading
```
Chart container not found
```
**Solution**: 
- Pastikan Lightweight Charts library ter-load
- Check browser console untuk error

#### 4. Data Not Updating
```
No real-time updates
```
**Solution**:
- Check WebSocket connection status
- Verify API endpoints
- Check network connectivity

### Debug Mode
Aktifkan debug mode dengan menambahkan di `.env`:
```env
DEBUG=true
NODE_ENV=development
```

## 🔒 Security

### API Key Security
- Jangan commit API keys ke repository
- Gunakan environment variables
- Rotate API keys secara berkala

### Rate Limiting
- Implemented rate limiting untuk API endpoints
- Default: 100 requests per 15 menit per IP

### CORS Configuration
- Configured untuk development
- Update untuk production deployment

## 📈 Performance

### Optimization Tips
- **Caching**: Analysis results cached untuk 5 menit
- **WebSocket**: Real-time updates tanpa polling
- **Lazy Loading**: Chart data loaded on demand
- **Compression**: Gzip compression enabled

### Monitoring
- **Health Check**: `/api/health` endpoint
- **Error Logging**: Console logging untuk debugging
- **Performance Metrics**: Response time monitoring

## 🤝 Contributing

### Development Setup
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests (if available)
npm test

# Build for production
npm run build
```

### Code Style
- Use ES6+ features
- Follow JavaScript best practices
- Add comments untuk complex logic
- Use meaningful variable names

## 📄 License

MIT License - see LICENSE file for details

## 📞 Support

### Documentation
- API Documentation: `/api/health` untuk status
- WebSocket Events: Lihat `server.js` untuk event list

### Issues
- Report bugs via GitHub Issues
- Include error logs dan steps to reproduce
- Provide environment details

### Features Request
- Submit feature requests via GitHub Issues
- Describe use case dan expected behavior
- Include mockups jika applicable

## 🔮 Roadmap

### Planned Features
- [ ] Portfolio Management
- [ ] Watchlist Management
- [ ] Advanced Chart Indicators
- [ ] Backtesting Engine
- [ ] Mobile App
- [ ] Multi-language Support
- [ ] Social Trading Features
- [ ] News Integration
- [ ] Economic Calendar
- [ ] Risk Management Tools

### Version History
- **v1.0.0**: Initial release dengan AI analysis dan real-time data
- **v1.1.0**: Enhanced technical indicators dan chart features
- **v1.2.0**: Portfolio dan watchlist management (planned)

---

**Disclaimer**: Aplikasi ini hanya untuk tujuan edukasi dan analisis. Semua rekomendasi trading harus diverifikasi secara independen. Trading saham memiliki risiko kerugian. Gunakan dengan bijak dan sesuai dengan risk tolerance Anda.
