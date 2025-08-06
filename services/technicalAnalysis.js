const { SMA, EMA, RSI, MACD, BollingerBands, Stochastic } = require('technicalindicators');

class TechnicalAnalysis {
  constructor() {
    this.defaultPeriods = {
      sma: [5, 10, 20, 50],
      ema: [5, 10, 20, 50],
      rsi: 14,
      macd: { fast: 12, slow: 26, signal: 9 },
      bollinger: 20,
      stochastic: 14
    };
  }

  calculateSMA(prices, period = 20) {
    try {
      const sma = SMA.calculate({ period, values: prices });
      return sma;
    } catch (error) {
      console.error('Error calculating SMA:', error);
      return [];
    }
  }

  calculateEMA(prices, period = 20) {
    try {
      const ema = EMA.calculate({ period, values: prices });
      return ema;
    } catch (error) {
      console.error('Error calculating EMA:', error);
      return [];
    }
  }

  calculateRSI(prices, period = 14) {
    try {
      const rsi = RSI.calculate({ period, values: prices });
      return rsi;
    } catch (error) {
      console.error('Error calculating RSI:', error);
      return [];
    }
  }

  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    try {
      const macd = MACD.calculate({
        fastPeriod,
        slowPeriod,
        signalPeriod,
        values: prices
      });
      return macd;
    } catch (error) {
      console.error('Error calculating MACD:', error);
      return [];
    }
  }

  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    try {
      const bb = BollingerBands.calculate({
        period,
        values: prices,
        stdDev
      });
      return bb;
    } catch (error) {
      console.error('Error calculating Bollinger Bands:', error);
      return [];
    }
  }

  calculateStochastic(high, low, close, period = 14, signalPeriod = 3) {
    try {
      const stoch = Stochastic.calculate({
        high,
        low,
        close,
        period,
        signalPeriod
      });
      return stoch;
    } catch (error) {
      console.error('Error calculating Stochastic:', error);
      return [];
    }
  }

  calculateVWAP(high, low, close, volume) {
    try {
      const vwap = [];
      let cumulativeTPV = 0; // Total Price Volume
      let cumulativeVolume = 0;

      for (let i = 0; i < close.length; i++) {
        const typicalPrice = (high[i] + low[i] + close[i]) / 3;
        cumulativeTPV += typicalPrice * volume[i];
        cumulativeVolume += volume[i];
        
        vwap.push(cumulativeTPV / cumulativeVolume);
      }

      return vwap;
    } catch (error) {
      console.error('Error calculating VWAP:', error);
      return [];
    }
  }

  calculateATR(high, low, close, period = 14) {
    try {
      const tr = [];
      const atr = [];

      for (let i = 0; i < high.length; i++) {
        if (i === 0) {
          tr.push(high[i] - low[i]);
        } else {
          const tr1 = high[i] - low[i];
          const tr2 = Math.abs(high[i] - close[i - 1]);
          const tr3 = Math.abs(low[i] - close[i - 1]);
          tr.push(Math.max(tr1, tr2, tr3));
        }
      }

      // Calculate ATR
      for (let i = 0; i < tr.length; i++) {
        if (i < period - 1) {
          atr.push(null);
        } else {
          const sum = tr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
          atr.push(sum / period);
        }
      }

      return atr;
    } catch (error) {
      console.error('Error calculating ATR:', error);
      return [];
    }
  }

  calculateSupportResistance(prices, period = 20) {
    try {
      const levels = [];
      const lookback = Math.min(period, prices.length);

      for (let i = lookback; i < prices.length; i++) {
        const window = prices.slice(i - lookback, i);
        const current = prices[i];
        
        const high = Math.max(...window);
        const low = Math.min(...window);
        
        // Support level (price near recent low)
        if (current <= low * 1.02) {
          levels.push({
            type: 'support',
            price: low,
            strength: this.calculateLevelStrength(prices, low, 'support'),
            index: i
          });
        }
        
        // Resistance level (price near recent high)
        if (current >= high * 0.98) {
          levels.push({
            type: 'resistance',
            price: high,
            strength: this.calculateLevelStrength(prices, high, 'resistance'),
            index: i
          });
        }
      }

      return levels;
    } catch (error) {
      console.error('Error calculating support/resistance:', error);
      return [];
    }
  }

  calculateLevelStrength(prices, level, type) {
    try {
      let touches = 0;
      const tolerance = level * 0.01; // 1% tolerance

      for (let price of prices) {
        if (type === 'support' && price >= level - tolerance && price <= level + tolerance) {
          touches++;
        } else if (type === 'resistance' && price >= level - tolerance && price <= level + tolerance) {
          touches++;
        }
      }

      return Math.min(touches / 10, 1); // Normalize to 0-1
    } catch (error) {
      return 0.5;
    }
  }

  generateSignals(indicators) {
    try {
      const signals = {
        overall: 'NEUTRAL',
        strength: 0,
        details: []
      };

      let bullishSignals = 0;
      let bearishSignals = 0;
      let totalSignals = 0;

      // RSI signals
      if (indicators.rsi && indicators.rsi.length > 0) {
        const currentRSI = indicators.rsi[indicators.rsi.length - 1];
        if (currentRSI < 30) {
          signals.details.push({ indicator: 'RSI', signal: 'BUY', value: currentRSI, reason: 'Oversold' });
          bullishSignals++;
        } else if (currentRSI > 70) {
          signals.details.push({ indicator: 'RSI', signal: 'SELL', value: currentRSI, reason: 'Overbought' });
          bearishSignals++;
        }
        totalSignals++;
      }

      // MACD signals
      if (indicators.macd && indicators.macd.length > 0) {
        const currentMACD = indicators.macd[indicators.macd.length - 1];
        const prevMACD = indicators.macd[indicators.macd.length - 2];
        
        if (currentMACD && prevMACD) {
          if (currentMACD.MACD > currentMACD.signal && prevMACD.MACD <= prevMACD.signal) {
            signals.details.push({ indicator: 'MACD', signal: 'BUY', value: currentMACD.MACD, reason: 'Bullish crossover' });
            bullishSignals++;
          } else if (currentMACD.MACD < currentMACD.signal && prevMACD.MACD >= prevMACD.signal) {
            signals.details.push({ indicator: 'MACD', signal: 'SELL', value: currentMACD.MACD, reason: 'Bearish crossover' });
            bearishSignals++;
          }
          totalSignals++;
        }
      }

      // Bollinger Bands signals
      if (indicators.bollinger && indicators.bollinger.length > 0) {
        const currentBB = indicators.bollinger[indicators.bollinger.length - 1];
        const currentPrice = indicators.prices[indicators.prices.length - 1];
        
        if (currentPrice <= currentBB.lower) {
          signals.details.push({ indicator: 'BB', signal: 'BUY', value: currentPrice, reason: 'Price at lower band' });
          bullishSignals++;
        } else if (currentPrice >= currentBB.upper) {
          signals.details.push({ indicator: 'BB', signal: 'SELL', value: currentPrice, reason: 'Price at upper band' });
          bearishSignals++;
        }
        totalSignals++;
      }

      // Stochastic signals
      if (indicators.stochastic && indicators.stochastic.length > 0) {
        const currentStoch = indicators.stochastic[indicators.stochastic.length - 1];
        if (currentStoch && currentStoch.k < 20) {
          signals.details.push({ indicator: 'Stoch', signal: 'BUY', value: currentStoch.k, reason: 'Oversold' });
          bullishSignals++;
        } else if (currentStoch && currentStoch.k > 80) {
          signals.details.push({ indicator: 'Stoch', signal: 'SELL', value: currentStoch.k, reason: 'Overbought' });
          bearishSignals++;
        }
        totalSignals++;
      }

      // Determine overall signal
      if (totalSignals > 0) {
        const bullishRatio = bullishSignals / totalSignals;
        const bearishRatio = bearishSignals / totalSignals;
        
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
      }

      return signals;
    } catch (error) {
      console.error('Error generating signals:', error);
      return {
        overall: 'NEUTRAL',
        strength: 0,
        details: []
      };
    }
  }

  async analyzeHistoricalData(historicalData) {
    try {
      const prices = historicalData.map(d => d.close);
      const high = historicalData.map(d => d.high);
      const low = historicalData.map(d => d.low);
      const volume = historicalData.map(d => d.volume);

      const indicators = {
        prices,
        sma: {
          5: this.calculateSMA(prices, 5),
          10: this.calculateSMA(prices, 10),
          20: this.calculateSMA(prices, 20),
          50: this.calculateSMA(prices, 50)
        },
        ema: {
          5: this.calculateEMA(prices, 5),
          10: this.calculateEMA(prices, 10),
          20: this.calculateEMA(prices, 20),
          50: this.calculateEMA(prices, 50)
        },
        rsi: this.calculateRSI(prices, 14),
        macd: this.calculateMACD(prices, 12, 26, 9),
        bollinger: this.calculateBollingerBands(prices, 20, 2),
        stochastic: this.calculateStochastic(high, low, prices, 14, 3),
        vwap: this.calculateVWAP(high, low, prices, volume),
        atr: this.calculateATR(high, low, prices, 14),
        supportResistance: this.calculateSupportResistance(prices, 20)
      };

      const signals = this.generateSignals(indicators);

      return {
        indicators,
        signals,
        summary: {
          currentPrice: prices[prices.length - 1],
          trend: this.determineTrend(prices),
          volatility: this.calculateVolatility(prices),
          momentum: this.calculateMomentum(prices)
        }
      };
    } catch (error) {
      console.error('Error analyzing historical data:', error);
      throw error;
    }
  }

  determineTrend(prices, period = 20) {
    try {
      if (prices.length < period) return 'UNKNOWN';
      
      const recent = prices.slice(-period);
      const sma = this.calculateSMA(recent, period);
      
      if (sma.length === 0) return 'UNKNOWN';
      
      const currentPrice = prices[prices.length - 1];
      const currentSMA = sma[sma.length - 1];
      
      if (currentPrice > currentSMA * 1.02) return 'UPTREND';
      if (currentPrice < currentSMA * 0.98) return 'DOWNTREND';
      return 'SIDEWAYS';
    } catch (error) {
      return 'UNKNOWN';
    }
  }

  calculateVolatility(prices, period = 20) {
    try {
      if (prices.length < period) return 0;
      
      const recent = prices.slice(-period);
      const returns = [];
      
      for (let i = 1; i < recent.length; i++) {
        returns.push((recent[i] - recent[i - 1]) / recent[i - 1]);
      }
      
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
      
      return Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility
    } catch (error) {
      return 0;
    }
  }

  calculateMomentum(prices, period = 10) {
    try {
      if (prices.length < period) return 0;
      
      const current = prices[prices.length - 1];
      const past = prices[prices.length - period - 1];
      
      return ((current - past) / past) * 100;
    } catch (error) {
      return 0;
    }
  }
}

module.exports = { TechnicalAnalysis };