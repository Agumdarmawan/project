# Setup Guide - AI Trading Analysis Website

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` file and add your API keys:
```env
# Required: Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Market Data APIs
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here
FINNHUB_API_KEY=your_finnhub_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 3. Start the Server
```bash
# Option 1: Using npm script
npm start

# Option 2: Using startup script
./start.sh

# Option 3: Direct node command
node server.js
```

### 4. Access the Website
Open your browser and go to: `http://localhost:3000`

## 🔑 Getting API Keys

### Google Gemini API (Required for AI Analysis)
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new project or select existing
3. Generate API key
4. Copy to `.env` file

### Market Data APIs (Optional - for real data)
- **Alpha Vantage**: [Get API Key](https://www.alphavantage.co/support/#api-key)
- **Finnhub**: [Get API Key](https://finnhub.io/register)

## 📊 Features Available

### With Gemini API Key:
- ✅ AI-powered trading analysis
- ✅ Real-time sentiment analysis
- ✅ Automated entry/exit recommendations
- ✅ Risk management calculations
- ✅ Technical indicator analysis

### Without API Keys (Mock Mode):
- ✅ Mock market data
- ✅ Technical indicators
- ✅ Chart visualization
- ✅ Order book simulation
- ✅ Real-time updates

## 🛠️ Troubleshooting

### Server Won't Start
```bash
# Check if port is in use
lsof -i :3000

# Kill existing processes
pkill -f "node server.js"

# Start fresh
node server.js
```

### API Errors
- Check `.env` file has correct API keys
- Verify API keys are valid
- Check internet connection
- Server will fallback to mock data if APIs fail

### Chart Not Loading
- Check browser console for errors
- Ensure Lightweight Charts library loads
- Refresh page if needed

## 📱 Browser Compatibility
- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (responsive design)

## 🔧 Development

### File Structure
```
├── server.js              # Main server file
├── services/              # Backend services
│   ├── geminiAI.js       # AI analysis service
│   ├── marketDataService.js # Market data service
│   ├── technicalAnalysis.js # Technical indicators
│   └── tradingAnalysis.js   # Combined analysis
├── public/                # Frontend files
│   ├── index.html         # Main HTML
│   ├── css/style.css      # Styling
│   └── js/app.js          # Frontend logic
└── package.json           # Dependencies
```

### Adding New Features
1. Backend: Add to appropriate service file
2. Frontend: Update HTML/CSS/JS as needed
3. API: Add new endpoints in `server.js`

## 📈 Performance Tips

### For Production
1. Set `NODE_ENV=production` in `.env`
2. Use real API keys for market data
3. Configure proper rate limiting
4. Set up monitoring and logging

### For Development
1. Use mock data for faster testing
2. Enable debug logging
3. Use smaller data sets for testing

## 🔒 Security Notes

- Never commit API keys to version control
- Use environment variables for sensitive data
- Implement proper rate limiting
- Validate all user inputs

## 📞 Support

If you encounter issues:
1. Check the console logs
2. Verify API keys are correct
3. Ensure all dependencies are installed
4. Check network connectivity

## 🎯 Next Steps

After successful setup:
1. Configure your preferred stocks
2. Set up risk tolerance levels
3. Customize chart timeframes
4. Test real-time features
5. Explore AI analysis capabilities

---

**Note**: This application is for educational purposes. Always verify trading signals independently and trade responsibly.