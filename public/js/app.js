// Main Application Class
class TradingApp {
    constructor() {
        this.socket = null;
        this.currentSymbol = 'BBCA';
        this.chart = null;
        this.updateInterval = 5000; // 5 seconds
        this.signals = [];
        this.isConnected = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.connectWebSocket();
        this.initializeChart();
        this.loadInitialData();
        this.startRealTimeUpdates();
    }

    setupEventListeners() {
        // Stock search
        document.getElementById('searchBtn').addEventListener('click', () => {
            this.searchStock();
        });

        document.getElementById('stockSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchStock();
            }
        });

        // Popular stock tags
        document.querySelectorAll('.stock-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                const symbol = e.target.dataset.symbol;
                this.selectStock(symbol);
            });
        });

        // Chart timeframe controls
        document.querySelectorAll('[data-timeframe]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.changeTimeframe(e.target.dataset.timeframe);
            });
        });

        // Settings modal
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettings();
        });

        document.getElementById('closeSettings').addEventListener('click', () => {
            this.closeSettings();
        });

        document.getElementById('cancelSettings').addEventListener('click', () => {
            this.closeSettings();
        });

        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
        });

        // Clear signals
        document.getElementById('clearSignals').addEventListener('click', () => {
            this.clearSignals();
        });

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleNavigation(e.target.getAttribute('href').substring(1));
            });
        });
    }

    connectWebSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.isConnected = true;
            this.updateConnectionStatus(true);
            
            // Subscribe to current symbol
            this.socket.emit('subscribe', { symbol: this.currentSymbol });
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.isConnected = false;
            this.updateConnectionStatus(false);
        });

        this.socket.on('stockData', (data) => {
            this.handleStockDataUpdate(data);
        });

        this.socket.on('error', (error) => {
            console.error('WebSocket error:', error);
            this.showNotification('Error: ' + error.message, 'error');
        });
    }

    updateConnectionStatus(connected) {
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.market-status span:last-child');
        
        if (connected) {
            statusIndicator.classList.add('active');
            statusText.textContent = 'Pasar Aktif';
        } else {
            statusIndicator.classList.remove('active');
            statusText.textContent = 'Pasar Tutup';
        }
    }

    async loadInitialData() {
        this.showLoading(true);
        
        try {
            // Load market overview
            await this.loadMarketOverview();
            
            // Load initial stock data
            await this.loadStockData(this.currentSymbol);
            
            // Load order book
            await this.loadOrderBook(this.currentSymbol);
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showNotification('Error loading data', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadMarketOverview() {
        try {
            const response = await fetch('/api/health');
            if (response.ok) {
                // Update market indices with mock data for now
                this.updateMarketIndices();
            }
        } catch (error) {
            console.error('Error loading market overview:', error);
        }
    }

    updateMarketIndices() {
        // Mock data - replace with real API calls
        const indices = [
            { id: 'ihsg', value: 7234.56, change: 45.23, changePercent: 0.63 },
            { id: 'lq45', value: 945.67, change: 12.34, changePercent: 1.32 },
            { id: 'idx30', value: 652.89, change: -8.76, changePercent: -1.32 }
        ];

        indices.forEach(index => {
            const valueEl = document.getElementById(`${index.id}-value`);
            const changeEl = document.getElementById(`${index.id}-change`);
            
            if (valueEl) valueEl.textContent = index.value.toLocaleString();
            if (changeEl) {
                const sign = index.change >= 0 ? '+' : '';
                changeEl.textContent = `${sign}${index.change.toFixed(2)} (${sign}${index.changePercent.toFixed(2)}%)`;
                changeEl.className = `index-change ${index.change >= 0 ? 'positive' : 'negative'}`;
            }
        });
    }

    async loadStockData(symbol) {
        try {
            const response = await fetch(`/api/stock/${symbol}`);
            if (response.ok) {
                const data = await response.json();
                this.updateStockData(data);
            }
        } catch (error) {
            console.error('Error loading stock data:', error);
        }
    }

    async loadOrderBook(symbol) {
        try {
            const response = await fetch(`/api/orderbook/${symbol}`);
            if (response.ok) {
                const data = await response.json();
                this.updateOrderBook(data);
            }
        } catch (error) {
            console.error('Error loading order book:', error);
        }
    }

    async loadAnalysis(symbol) {
        try {
            const response = await fetch(`/api/analysis/${symbol}`);
            if (response.ok) {
                const data = await response.json();
                this.updateAnalysis(data);
            }
        } catch (error) {
            console.error('Error loading analysis:', error);
        }
    }

    handleStockDataUpdate(data) {
        this.updateStockData(data.data);
        this.updateAnalysis(data.analysis);
        this.addSignal({
            type: 'update',
            symbol: data.symbol,
            price: data.data.lastPrice,
            change: data.data.change,
            timestamp: new Date()
        });
    }

    updateStockData(data) {
        if (!data) return;

        // Update chart title
        document.getElementById('chartTitle').textContent = `${data.symbol} - ${this.getStockName(data.symbol)}`;
        
        // Update market data
        document.getElementById('lastPrice').textContent = `Rp ${data.lastPrice.toLocaleString()}`;
        
        const changeText = `${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)} (${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(2)}%)`;
        const changeEl = document.getElementById('priceChange');
        changeEl.textContent = changeText;
        changeEl.className = `data-value ${data.change >= 0 ? 'positive' : 'negative'}`;
        
        document.getElementById('volume').textContent = data.volume.toLocaleString();
        document.getElementById('highPrice').textContent = `Rp ${data.high.toLocaleString()}`;
        document.getElementById('lowPrice').textContent = `Rp ${data.low.toLocaleString()}`;
        document.getElementById('openPrice').textContent = `Rp ${data.open.toLocaleString()}`;

        // Update chart
        this.updateChart(data);
    }

    updateAnalysis(analysis) {
        if (!analysis) return;

        // Update AI sentiment
        const sentimentBadge = document.getElementById('sentimentBadge');
        const confidenceFill = document.getElementById('confidenceFill');
        const confidenceText = document.getElementById('confidenceText');
        
        sentimentBadge.className = `sentiment-badge ${analysis.aiAnalysis.sentiment.toLowerCase()}`;
        sentimentBadge.innerHTML = `
            <i class="fas fa-arrow-${analysis.aiAnalysis.sentiment === 'BULLISH' ? 'up' : analysis.aiAnalysis.sentiment === 'BEARISH' ? 'down' : 'right'}"></i>
            <span>${analysis.aiAnalysis.sentiment}</span>
        `;
        
        confidenceFill.style.width = `${analysis.aiAnalysis.confidence}%`;
        confidenceText.textContent = `${analysis.aiAnalysis.confidence}%`;

        // Update recommendation
        const actionBadge = document.getElementById('actionBadge');
        const recommendation = analysis.combinedRecommendation;
        
        actionBadge.className = `action-badge ${recommendation.action.toLowerCase()}`;
        actionBadge.textContent = recommendation.action;

        // Update trading levels
        document.getElementById('entryPrice').textContent = `Rp ${analysis.levels.entry.toLocaleString()}`;
        document.getElementById('takeProfit').textContent = `Rp ${analysis.levels.takeProfit.toLocaleString()}`;
        document.getElementById('stopLoss').textContent = `Rp ${analysis.levels.stopLoss.toLocaleString()}`;

        // Update risk metrics
        document.getElementById('riskReward').textContent = analysis.riskMetrics.riskRewardRatio;
        document.getElementById('riskLevel').textContent = analysis.riskMetrics.marketRisk;

        // Update AI analysis text
        document.getElementById('aiAnalysisText').textContent = analysis.aiAnalysis.analysis;

        // Update technical indicators
        this.updateTechnicalIndicators(analysis.technicalAnalysis);
    }

    updateTechnicalIndicators(technicalAnalysis) {
        if (!technicalAnalysis || !technicalAnalysis.indicators) return;

        const indicators = technicalAnalysis.indicators;

        // RSI
        if (indicators.rsi && indicators.rsi.length > 0) {
            const rsiValue = indicators.rsi[indicators.rsi.length - 1];
            document.getElementById('rsiValue').textContent = rsiValue.toFixed(1);
            document.getElementById('rsiFill').style.width = `${rsiValue}%`;
            
            let rsiSignal = 'neutral';
            if (rsiValue < 30) rsiSignal = 'bullish';
            else if (rsiValue > 70) rsiSignal = 'bearish';
            
            const rsiSignalEl = document.getElementById('rsiSignal');
            rsiSignalEl.className = `indicator-signal ${rsiSignal}`;
            rsiSignalEl.textContent = rsiSignal.toUpperCase();
        }

        // MACD
        if (indicators.macd && indicators.macd.length > 0) {
            const macdValue = indicators.macd[indicators.macd.length - 1];
            const macdValueEl = document.getElementById('macdValue');
            macdValueEl.textContent = macdValue.MACD.toFixed(2);
            
            const macdFillEl = document.getElementById('macdFill');
            const macdPercent = Math.min(Math.max((macdValue.MACD + 2) / 4 * 100, 0), 100);
            macdFillEl.style.width = `${macdPercent}%`;
            
            const macdSignalEl = document.getElementById('macdSignal');
            const macdSignal = macdValue.MACD > macdValue.signal ? 'bullish' : 'bearish';
            macdSignalEl.className = `indicator-signal ${macdSignal}`;
            macdSignalEl.textContent = macdSignal.toUpperCase();
        }

        // Stochastic
        if (indicators.stochastic && indicators.stochastic.length > 0) {
            const stochValue = indicators.stochastic[indicators.stochastic.length - 1];
            if (stochValue) {
                document.getElementById('stochValue').textContent = stochValue.k.toFixed(1);
                document.getElementById('stochFill').style.width = `${stochValue.k}%`;
                
                let stochSignal = 'neutral';
                if (stochValue.k < 20) stochSignal = 'bullish';
                else if (stochValue.k > 80) stochSignal = 'bearish';
                
                const stochSignalEl = document.getElementById('stochSignal');
                stochSignalEl.className = `indicator-signal ${stochSignal}`;
                stochSignalEl.textContent = stochSignal.toUpperCase();
            }
        }

        // Bollinger Bands
        if (indicators.bollinger && indicators.bollinger.length > 0) {
            const bbValue = indicators.bollinger[indicators.bollinger.length - 1];
            const currentPrice = technicalAnalysis.summary.currentPrice;
            
            const bbPosition = (currentPrice - bbValue.lower) / (bbValue.upper - bbValue.lower);
            const bbPercent = Math.min(Math.max(bbPosition * 100, 0), 100);
            
            document.getElementById('bbValue').textContent = bbPosition.toFixed(2);
            document.getElementById('bbFill').style.width = `${bbPercent}%`;
            
            let bbSignal = 'neutral';
            if (bbPosition < 0.2) bbSignal = 'bullish';
            else if (bbPosition > 0.8) bbSignal = 'bearish';
            
            const bbSignalEl = document.getElementById('bbSignal');
            bbSignalEl.className = `indicator-signal ${bbSignal}`;
            bbSignalEl.textContent = bbSignal.toUpperCase();
        }
    }

    updateOrderBook(orderbook) {
        if (!orderbook) return;

        // Update spread info
        document.getElementById('spreadValue').textContent = `Rp ${orderbook.spread.toFixed(2)}`;
        document.getElementById('spreadPercent').textContent = `(${orderbook.spreadPercent.toFixed(2)}%)`;

        // Update asks
        const asksContainer = document.getElementById('asksContainer');
        asksContainer.innerHTML = '';
        orderbook.asks.slice(0, 10).forEach(ask => {
            const row = document.createElement('div');
            row.className = 'orderbook-row';
            row.innerHTML = `
                <span>${ask.price.toFixed(2)}</span>
                <span>${ask.quantity.toLocaleString()}</span>
                <span>${ask.total.toLocaleString()}</span>
            `;
            asksContainer.appendChild(row);
        });

        // Update bids
        const bidsContainer = document.getElementById('bidsContainer');
        bidsContainer.innerHTML = '';
        orderbook.bids.slice(0, 10).forEach(bid => {
            const row = document.createElement('div');
            row.className = 'orderbook-row';
            row.innerHTML = `
                <span>${bid.price.toFixed(2)}</span>
                <span>${bid.quantity.toLocaleString()}</span>
                <span>${bid.total.toLocaleString()}</span>
            `;
            bidsContainer.appendChild(row);
        });
    }

    initializeChart() {
        const chartContainer = document.getElementById('tradingChart');
        
        this.chart = LightweightCharts.createChart(chartContainer, {
            width: chartContainer.clientWidth,
            height: chartContainer.clientHeight,
            layout: {
                background: { color: 'transparent' },
                textColor: '#ffffff',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.1)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.1)' },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
                timeVisible: true,
                secondsVisible: false,
            },
        });

        this.candlestickSeries = this.chart.addCandlestickSeries({
            upColor: '#2ed573',
            downColor: '#ff4757',
            borderDownColor: '#ff4757',
            borderUpColor: '#2ed573',
            wickDownColor: '#ff4757',
            wickUpColor: '#2ed573',
        });

        // Add volume series
        this.volumeSeries = this.chart.addHistogramSeries({
            color: '#00d4ff',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '',
            scaleMargins: {
                top: 0.8,
                bottom: 0,
            },
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.chart.applyOptions({
                width: chartContainer.clientWidth,
                height: chartContainer.clientHeight,
            });
        });
    }

    updateChart(data) {
        // Generate mock candlestick data
        const candlestickData = this.generateMockCandlestickData(data);
        const volumeData = this.generateMockVolumeData(data);

        this.candlestickSeries.setData(candlestickData);
        this.volumeSeries.setData(volumeData);
    }

    generateMockCandlestickData(data) {
        const data = [];
        const basePrice = data.lastPrice;
        const now = new Date();
        
        for (let i = 30; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 5 * 60 * 1000); // 5 minute intervals
            const open = basePrice + (Math.random() - 0.5) * 50;
            const high = open + Math.random() * 30;
            const low = open - Math.random() * 30;
            const close = low + Math.random() * (high - low);
            
            data.push({
                time: Math.floor(time.getTime() / 1000),
                open: open,
                high: high,
                low: low,
                close: close
            });
        }
        
        return data;
    }

    generateMockVolumeData(data) {
        const data = [];
        const now = new Date();
        
        for (let i = 30; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 5 * 60 * 1000);
            const volume = Math.floor(Math.random() * 100000) + 50000;
            
            data.push({
                time: Math.floor(time.getTime() / 1000),
                value: volume,
                color: Math.random() > 0.5 ? '#2ed573' : '#ff4757'
            });
        }
        
        return data;
    }

    searchStock() {
        const searchInput = document.getElementById('stockSearch');
        const symbol = searchInput.value.trim().toUpperCase();
        
        if (symbol) {
            this.selectStock(symbol);
        }
    }

    selectStock(symbol) {
        this.currentSymbol = symbol;
        
        // Update UI
        document.getElementById('stockSearch').value = symbol;
        
        // Unsubscribe from previous symbol
        if (this.socket && this.isConnected) {
            this.socket.emit('unsubscribe', { symbol: this.currentSymbol });
        }
        
        // Subscribe to new symbol
        if (this.socket && this.isConnected) {
            this.socket.emit('subscribe', { symbol: this.currentSymbol });
        }
        
        // Load data for new symbol
        this.loadStockData(symbol);
        this.loadOrderBook(symbol);
        this.loadAnalysis(symbol);
        
        // Update active stock tag
        document.querySelectorAll('.stock-tag').forEach(tag => {
            tag.classList.remove('active');
            if (tag.dataset.symbol === symbol) {
                tag.classList.add('active');
            }
        });
    }

    changeTimeframe(timeframe) {
        // Update active button
        document.querySelectorAll('[data-timeframe]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-timeframe="${timeframe}"]`).classList.add('active');
        
        // Reload chart data with new timeframe
        this.loadStockData(this.currentSymbol);
    }

    addSignal(signal) {
        this.signals.unshift(signal);
        
        // Keep only last 50 signals
        if (this.signals.length > 50) {
            this.signals = this.signals.slice(0, 50);
        }
        
        this.updateSignalsDisplay();
    }

    updateSignalsDisplay() {
        const container = document.getElementById('signalsContainer');
        container.innerHTML = '';
        
        this.signals.slice(0, 10).forEach(signal => {
            const signalEl = document.createElement('div');
            signalEl.className = `signal-item ${signal.type}`;
            
            const icon = signal.type === 'buy' ? 'fa-arrow-up' : 
                        signal.type === 'sell' ? 'fa-arrow-down' : 'fa-info-circle';
            
            signalEl.innerHTML = `
                <i class="fas ${icon} signal-icon"></i>
                <div class="signal-content">
                    <div class="signal-title">${signal.symbol} - ${signal.type.toUpperCase()}</div>
                    <div class="signal-description">Price: Rp ${signal.price.toLocaleString()} (${signal.change >= 0 ? '+' : ''}${signal.change.toFixed(2)})</div>
                    <div class="signal-time">${signal.timestamp.toLocaleTimeString()}</div>
                </div>
            `;
            
            container.appendChild(signalEl);
        });
    }

    clearSignals() {
        this.signals = [];
        this.updateSignalsDisplay();
    }

    openSettings() {
        document.getElementById('settingsModal').classList.add('active');
    }

    closeSettings() {
        document.getElementById('settingsModal').classList.remove('active');
    }

    saveSettings() {
        const apiKey = document.getElementById('geminiApiKey').value;
        const interval = document.getElementById('updateInterval').value;
        const riskTolerance = document.getElementById('riskTolerance').value;
        
        // Save to localStorage
        localStorage.setItem('geminiApiKey', apiKey);
        localStorage.setItem('updateInterval', interval);
        localStorage.setItem('riskTolerance', riskTolerance);
        
        // Update app settings
        this.updateInterval = interval * 1000;
        
        this.closeSettings();
        this.showNotification('Settings saved successfully', 'success');
    }

    handleNavigation(section) {
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[href="#${section}"]`).classList.add('active');
        
        // Handle section-specific logic
        switch (section) {
            case 'dashboard':
                // Already on dashboard
                break;
            case 'analysis':
                // Could load detailed analysis view
                break;
            case 'watchlist':
                // Could load watchlist
                break;
            case 'portfolio':
                // Could load portfolio
                break;
        }
    }

    startRealTimeUpdates() {
        setInterval(() => {
            if (this.isConnected) {
                // Real-time updates are handled by WebSocket
                // This interval can be used for additional updates
            }
        }, this.updateInterval);
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    getStockName(symbol) {
        const stockNames = {
            'BBCA': 'Bank Central Asia Tbk',
            'BBRI': 'Bank Rakyat Indonesia Tbk',
            'ASII': 'Astra International Tbk',
            'TLKM': 'Telkom Indonesia Tbk',
            'ICBP': 'Indofood CBP Sukses Makmur Tbk',
            'UNVR': 'Unilever Indonesia Tbk',
            'PGAS': 'Perusahaan Gas Negara Tbk',
            'KLBF': 'Kalbe Farma Tbk',
            'SMGR': 'Semen Indonesia Tbk',
            'INDF': 'Indofood Sukses Makmur Tbk'
        };
        
        return stockNames[symbol] || symbol;
    }

    // Utility methods
    formatNumber(num) {
        return num.toLocaleString();
    }

    formatCurrency(amount) {
        return `Rp ${amount.toLocaleString()}`;
    }

    formatPercentage(value) {
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.tradingApp = new TradingApp();
});

// Add notification styles
const notificationStyles = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 4000;
        animation: slideInRight 0.3s ease-out;
    }
    
    .notification.success {
        background: #2ed573;
    }
    
    .notification.error {
        background: #ff4757;
    }
    
    .notification.info {
        background: #00d4ff;
    }
    
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);