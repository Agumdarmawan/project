const { MarketDataService } = require('./marketDataService');

class TradingAnalysis {
  constructor(geminiAI, technicalAnalysis) {
    this.geminiAI = geminiAI;
    this.technicalAnalysis = technicalAnalysis;
    this.marketDataService = new MarketDataService();
    this.analysisCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async getAnalysis(symbol) {
    try {
      // Check cache first
      const cached = this.analysisCache.get(symbol);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      // Get market data
      const marketData = await this.marketDataService.getStockData(symbol);
      const historicalData = await this.marketDataService.getHistoricalData(symbol, '1d', '1mo');
      const orderbook = await this.marketDataService.getOrderBook(symbol);

      // Perform technical analysis
      const technicalAnalysis = await this.technicalAnalysis.analyzeHistoricalData(historicalData);

      // Get AI analysis
      let aiAnalysis;
      if (this.geminiAI) {
        aiAnalysis = await this.geminiAI.analyzeMarketData(
          symbol,
          marketData,
          technicalAnalysis.indicators
        );
      } else {
        // Mock AI analysis when Gemini is not available
        aiAnalysis = this.getMockAIAnalysis(symbol, marketData, technicalAnalysis);
      }

      // Combine analyses
      const combinedAnalysis = this.combineAnalyses(
        symbol,
        marketData,
        technicalAnalysis,
        aiAnalysis,
        orderbook
      );

      // Cache the result
      this.analysisCache.set(symbol, {
        data: combinedAnalysis,
        timestamp: Date.now()
      });

      return combinedAnalysis;
    } catch (error) {
      console.error(`Error getting analysis for ${symbol}:`, error);
      return this.getFallbackAnalysis(symbol);
    }
  }

  combineAnalyses(symbol, marketData, technicalAnalysis, aiAnalysis, orderbook) {
    try {
      const currentPrice = marketData.lastPrice;
      const technicalSignals = technicalAnalysis.signals;
      const aiRecommendation = aiAnalysis.recommendation;

      // Calculate risk metrics
      const riskMetrics = this.calculateRiskMetrics(marketData, technicalAnalysis, orderbook);

      // Generate trading signals
      const tradingSignals = this.generateTradingSignals(
        technicalSignals,
        aiAnalysis,
        currentPrice,
        riskMetrics
      );

      // Calculate entry, TP, SL levels
      const levels = this.calculateTradingLevels(
        currentPrice,
        technicalAnalysis,
        aiAnalysis,
        riskMetrics
      );

      return {
        symbol,
        timestamp: new Date().toISOString(),
        marketData,
        technicalAnalysis: {
          indicators: technicalAnalysis.indicators,
          signals: technicalSignals,
          summary: technicalAnalysis.summary
        },
        aiAnalysis: {
          sentiment: aiAnalysis.sentiment,
          confidence: aiAnalysis.confidence,
          analysis: aiAnalysis.analysis,
          recommendation: aiRecommendation
        },
        tradingSignals,
        riskMetrics,
        levels,
        orderbook: {
          spread: orderbook.spread,
          spreadPercent: orderbook.spreadPercent,
          bidAskRatio: this.calculateBidAskRatio(orderbook)
        },
        combinedRecommendation: this.getCombinedRecommendation(
          technicalSignals,
          aiAnalysis,
          riskMetrics
        )
      };
    } catch (error) {
      console.error('Error combining analyses:', error);
      throw error;
    }
  }

  calculateRiskMetrics(marketData, technicalAnalysis, orderbook) {
    try {
      const volatility = technicalAnalysis.summary.volatility;
      const atr = technicalAnalysis.indicators.atr;
      const currentATR = atr && atr.length > 0 ? atr[atr.length - 1] : 0;
      
      // Calculate position sizing based on ATR
      const riskPerTrade = 0.02; // 2% risk per trade
      const accountSize = 1000000; // Assume 1M account
      const maxRiskAmount = accountSize * riskPerTrade;
      
      // Calculate stop loss distance
      const stopLossDistance = currentATR * 2; // 2x ATR for stop loss
      
      // Calculate position size
      const positionSize = maxRiskAmount / stopLossDistance;
      
      // Calculate risk/reward ratio
      const takeProfitDistance = stopLossDistance * 2; // 1:2 risk/reward
      const riskRewardRatio = takeProfitDistance / stopLossDistance;

      return {
        volatility: Math.round(volatility * 100) / 100,
        atr: Math.round(currentATR * 100) / 100,
        stopLossDistance: Math.round(stopLossDistance * 100) / 100,
        takeProfitDistance: Math.round(takeProfitDistance * 100) / 100,
        positionSize: Math.floor(positionSize),
        maxRiskAmount: Math.round(maxRiskAmount),
        riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
        marketRisk: this.calculateMarketRisk(marketData, technicalAnalysis),
        liquidityRisk: this.calculateLiquidityRisk(orderbook)
      };
    } catch (error) {
      console.error('Error calculating risk metrics:', error);
      return {
        volatility: 0,
        atr: 0,
        stopLossDistance: 0,
        takeProfitDistance: 0,
        positionSize: 0,
        maxRiskAmount: 0,
        riskRewardRatio: 0,
        marketRisk: 'MEDIUM',
        liquidityRisk: 'MEDIUM'
      };
    }
  }

  calculateMarketRisk(marketData, technicalAnalysis) {
    try {
      const volatility = technicalAnalysis.summary.volatility;
      const volume = marketData.volume;
      const changePercent = Math.abs(marketData.changePercent);

      if (volatility > 0.3 || changePercent > 5) return 'HIGH';
      if (volatility > 0.2 || changePercent > 3) return 'MEDIUM';
      return 'LOW';
    } catch (error) {
      return 'MEDIUM';
    }
  }

  calculateLiquidityRisk(orderbook) {
    try {
      const totalBids = orderbook.bids.reduce((sum, bid) => sum + bid.quantity, 0);
      const totalAsks = orderbook.asks.reduce((sum, ask) => sum + ask.quantity, 0);
      const avgQuantity = (totalBids + totalAsks) / 2;

      if (avgQuantity < 10000) return 'HIGH';
      if (avgQuantity < 50000) return 'MEDIUM';
      return 'LOW';
    } catch (error) {
      return 'MEDIUM';
    }
  }

  calculateBidAskRatio(orderbook) {
    try {
      const totalBids = orderbook.bids.reduce((sum, bid) => sum + bid.quantity, 0);
      const totalAsks = orderbook.asks.reduce((sum, ask) => sum + ask.quantity, 0);
      
      return totalAsks > 0 ? totalBids / totalAsks : 1;
    } catch (error) {
      return 1;
    }
  }

  generateTradingSignals(technicalSignals, aiAnalysis, currentPrice, riskMetrics) {
    try {
      const signals = {
        overall: 'NEUTRAL',
        strength: 0,
        confidence: 0,
        details: []
      };

      // Combine technical and AI signals
      let bullishCount = 0;
      let bearishCount = 0;
      let totalSignals = 0;

      // Technical signals
      if (technicalSignals.overall === 'BULLISH') {
        bullishCount += technicalSignals.strength;
        signals.details.push({
          source: 'Technical',
          signal: 'BUY',
          strength: technicalSignals.strength,
          reason: 'Technical indicators bullish'
        });
      } else if (technicalSignals.overall === 'BEARISH') {
        bearishCount += technicalSignals.strength;
        signals.details.push({
          source: 'Technical',
          signal: 'SELL',
          strength: technicalSignals.strength,
          reason: 'Technical indicators bearish'
        });
      }
      totalSignals++;

      // AI signals
      if (aiAnalysis.sentiment === 'BULLISH') {
        bullishCount += aiAnalysis.confidence / 100;
        signals.details.push({
          source: 'AI',
          signal: 'BUY',
          strength: aiAnalysis.confidence / 100,
          reason: aiAnalysis.analysis.substring(0, 100) + '...'
        });
      } else if (aiAnalysis.sentiment === 'BEARISH') {
        bearishCount += aiAnalysis.confidence / 100;
        signals.details.push({
          source: 'AI',
          signal: 'SELL',
          strength: aiAnalysis.confidence / 100,
          reason: aiAnalysis.analysis.substring(0, 100) + '...'
        });
      }
      totalSignals++;

      // Determine overall signal
      if (totalSignals > 0) {
        const bullishRatio = bullishCount / totalSignals;
        const bearishRatio = bearishCount / totalSignals;

        if (bullishRatio > 0.6) {
          signals.overall = 'BULLISH';
          signals.strength = bullishRatio;
        } else if (bearishRatio > 0.6) {
          signals.overall = 'BEARISH';
          signals.strength = bearishRatio;
        } else {
          signals.overall = 'NEUTRAL';
          signals.strength = 0.5;
        }

        signals.confidence = Math.round((signals.strength * 100));
      }

      return signals;
    } catch (error) {
      console.error('Error generating trading signals:', error);
      return {
        overall: 'NEUTRAL',
        strength: 0,
        confidence: 0,
        details: []
      };
    }
  }

  calculateTradingLevels(currentPrice, technicalAnalysis, aiAnalysis, riskMetrics) {
    try {
      const levels = {
        entry: currentPrice,
        takeProfit: currentPrice,
        stopLoss: currentPrice,
        support: [],
        resistance: []
      };

      // Get support and resistance levels
      if (technicalAnalysis.indicators.supportResistance) {
        const srLevels = technicalAnalysis.indicators.supportResistance;
        levels.support = srLevels
          .filter(level => level.type === 'support')
          .map(level => level.price)
          .slice(0, 3);
        levels.resistance = srLevels
          .filter(level => level.type === 'resistance')
          .map(level => level.price)
          .slice(0, 3);
      }

      // Calculate entry, TP, SL based on signal
      const signal = this.getCombinedRecommendation(
        technicalAnalysis.signals,
        aiAnalysis,
        riskMetrics
      );

      if (signal.action === 'BUY') {
        levels.entry = currentPrice;
        levels.takeProfit = currentPrice + riskMetrics.takeProfitDistance;
        levels.stopLoss = currentPrice - riskMetrics.stopLossDistance;
      } else if (signal.action === 'SELL') {
        levels.entry = currentPrice;
        levels.takeProfit = currentPrice - riskMetrics.takeProfitDistance;
        levels.stopLoss = currentPrice + riskMetrics.stopLossDistance;
      }

      return {
        entry: Math.round(levels.entry * 100) / 100,
        takeProfit: Math.round(levels.takeProfit * 100) / 100,
        stopLoss: Math.round(levels.stopLoss * 100) / 100,
        support: levels.support.map(price => Math.round(price * 100) / 100),
        resistance: levels.resistance.map(price => Math.round(price * 100) / 100)
      };
    } catch (error) {
      console.error('Error calculating trading levels:', error);
      return {
        entry: currentPrice,
        takeProfit: currentPrice,
        stopLoss: currentPrice,
        support: [],
        resistance: []
      };
    }
  }

  getCombinedRecommendation(technicalSignals, aiAnalysis, riskMetrics) {
    try {
      const recommendation = {
        action: 'HOLD',
        confidence: 0,
        reason: '',
        timeframe: '5m',
        riskLevel: 'MEDIUM'
      };

      // Determine action based on signals
      if (technicalSignals.overall === 'BULLISH' && aiAnalysis.sentiment === 'BULLISH') {
        recommendation.action = 'BUY';
        recommendation.confidence = Math.round((technicalSignals.strength + aiAnalysis.confidence / 100) / 2 * 100);
        recommendation.reason = 'Strong bullish signals from both technical and AI analysis';
      } else if (technicalSignals.overall === 'BEARISH' && aiAnalysis.sentiment === 'BEARISH') {
        recommendation.action = 'SELL';
        recommendation.confidence = Math.round((technicalSignals.strength + aiAnalysis.confidence / 100) / 2 * 100);
        recommendation.reason = 'Strong bearish signals from both technical and AI analysis';
      } else if (technicalSignals.overall === 'BULLISH' || aiAnalysis.sentiment === 'BULLISH') {
        recommendation.action = 'BUY';
        recommendation.confidence = Math.round(Math.max(technicalSignals.strength, aiAnalysis.confidence / 100) * 100);
        recommendation.reason = 'Mixed signals with bullish bias';
      } else if (technicalSignals.overall === 'BEARISH' || aiAnalysis.sentiment === 'BEARISH') {
        recommendation.action = 'SELL';
        recommendation.confidence = Math.round(Math.max(technicalSignals.strength, aiAnalysis.confidence / 100) * 100);
        recommendation.reason = 'Mixed signals with bearish bias';
      } else {
        recommendation.action = 'HOLD';
        recommendation.confidence = 50;
        recommendation.reason = 'Neutral signals, wait for clearer direction';
      }

      // Determine risk level
      if (riskMetrics.volatility > 0.3 || riskMetrics.marketRisk === 'HIGH') {
        recommendation.riskLevel = 'HIGH';
      } else if (riskMetrics.volatility > 0.2 || riskMetrics.marketRisk === 'MEDIUM') {
        recommendation.riskLevel = 'MEDIUM';
      } else {
        recommendation.riskLevel = 'LOW';
      }

      return recommendation;
    } catch (error) {
      console.error('Error getting combined recommendation:', error);
      return {
        action: 'HOLD',
        confidence: 0,
        reason: 'Analysis error',
        timeframe: '5m',
        riskLevel: 'MEDIUM'
      };
    }
  }

  getMockAIAnalysis(symbol, marketData, technicalAnalysis) {
    // Generate realistic mock AI analysis based on technical indicators
    const currentPrice = marketData.lastPrice;
    const change = marketData.change;
    const volume = marketData.volume;
    
    // Determine sentiment based on price movement and technical signals
    let sentiment = 'NEUTRAL';
    let confidence = 50;
    let action = 'HOLD';
    
    if (change > 0 && technicalAnalysis.signals.overall === 'BULLISH') {
      sentiment = 'BULLISH';
      confidence = 70;
      action = 'BUY';
    } else if (change < 0 && technicalAnalysis.signals.overall === 'BEARISH') {
      sentiment = 'BEARISH';
      confidence = 70;
      action = 'SELL';
    } else if (change > 0) {
      sentiment = 'BULLISH';
      confidence = 60;
      action = 'BUY';
    } else if (change < 0) {
      sentiment = 'BEARISH';
      confidence = 60;
      action = 'SELL';
    }
    
    // Generate analysis text
    const analysisText = this.generateMockAnalysisText(symbol, sentiment, currentPrice, change, volume);
    
    // Calculate levels
    const entryPrice = currentPrice;
    const takeProfit = action === 'BUY' ? currentPrice * 1.03 : currentPrice * 0.97;
    const stopLoss = action === 'BUY' ? currentPrice * 0.985 : currentPrice * 1.015;
    
    return {
      sentiment,
      confidence,
      analysis: analysisText,
      recommendation: {
        action,
        entry_price: entryPrice,
        take_profit: takeProfit,
        stop_loss: stopLoss,
        timeframe: '5m',
        risk_reward_ratio: '1:2'
      },
      key_levels: {
        support: [currentPrice * 0.98, currentPrice * 0.96],
        resistance: [currentPrice * 1.02, currentPrice * 1.04]
      },
      indicators_summary: 'Mock AI analysis based on technical indicators',
      risk_warning: 'This is mock analysis. Please verify all signals before trading.'
    };
  }

  generateMockAnalysisText(symbol, sentiment, price, change, volume) {
    const changePercent = ((change / (price - change)) * 100).toFixed(2);
    const sign = change >= 0 ? '+' : '';
    
    if (sentiment === 'BULLISH') {
      return `Analisis mock untuk ${symbol} menunjukkan sinyal bullish. Harga saat ini Rp ${price.toLocaleString()} dengan perubahan ${sign}${changePercent}%. Volume trading ${volume.toLocaleString()} menunjukkan minat yang baik. Rekomendasi untuk entry di level support dengan target profit 3% dan stop loss 1.5%.`;
    } else if (sentiment === 'BEARISH') {
      return `Analisis mock untuk ${symbol} menunjukkan sinyal bearish. Harga saat ini Rp ${price.toLocaleString()} dengan perubahan ${sign}${changePercent}%. Volume trading ${volume.toLocaleString()} menunjukkan tekanan jual. Rekomendasi untuk entry di level resistance dengan target profit 3% dan stop loss 1.5%.`;
    } else {
      return `Analisis mock untuk ${symbol} menunjukkan sinyal netral. Harga saat ini Rp ${price.toLocaleString()} dengan perubahan ${sign}${changePercent}%. Volume trading ${volume.toLocaleString()}. Tunggu sinyal yang lebih jelas sebelum melakukan entry.`;
    }
  }

  getFallbackAnalysis(symbol) {
    return {
      symbol,
      timestamp: new Date().toISOString(),
      marketData: null,
      technicalAnalysis: {
        indicators: {},
        signals: { overall: 'NEUTRAL', strength: 0, details: [] },
        summary: { currentPrice: 0, trend: 'UNKNOWN', volatility: 0, momentum: 0 }
      },
      aiAnalysis: {
        sentiment: 'NEUTRAL',
        confidence: 0,
        analysis: 'Analysis unavailable',
        recommendation: { action: 'HOLD', entry_price: 'N/A', take_profit: 'N/A', stop_loss: 'N/A' }
      },
      tradingSignals: { overall: 'NEUTRAL', strength: 0, confidence: 0, details: [] },
      riskMetrics: { volatility: 0, atr: 0, riskRewardRatio: 0, marketRisk: 'MEDIUM' },
      levels: { entry: 0, takeProfit: 0, stopLoss: 0, support: [], resistance: [] },
      orderbook: { spread: 0, spreadPercent: 0, bidAskRatio: 1 },
      combinedRecommendation: { action: 'HOLD', confidence: 0, reason: 'Service unavailable', timeframe: '5m', riskLevel: 'MEDIUM' }
    };
  }

  clearCache() {
    this.analysisCache.clear();
  }

  getCacheStats() {
    return {
      size: this.analysisCache.size,
      entries: Array.from(this.analysisCache.keys())
    };
  }
}

module.exports = { TradingAnalysis };