const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiAI {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
  }

  async analyzeMarketData(symbol, marketData, technicalIndicators) {
    try {
      const prompt = this.buildAnalysisPrompt(symbol, marketData, technicalIndicators);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return this.parseAnalysisResponse(response.text());
    } catch (error) {
      console.error('Error in Gemini AI analysis:', error);
      throw new Error('Failed to analyze market data with AI');
    }
  }

  buildAnalysisPrompt(symbol, marketData, technicalIndicators) {
    return `
    Anda adalah seorang analis trading saham yang ahli dalam teknikal analisis untuk scalping. 
    Analisis saham ${symbol} berdasarkan data berikut:

    DATA PASAR:
    - Harga Terakhir: ${marketData.lastPrice}
    - Perubahan: ${marketData.change}
    - Volume: ${marketData.volume}
    - High: ${marketData.high}
    - Low: ${marketData.low}
    - Open: ${marketData.open}

    INDIKATOR TEKNIKAL:
    ${JSON.stringify(technicalIndicators, null, 2)}

    Berikan analisis dalam format JSON dengan struktur berikut:
    {
      "sentiment": "BULLISH/BEARISH/NEUTRAL",
      "confidence": 0-100,
      "analysis": "Penjelasan analisis teknikal",
      "recommendation": {
        "action": "BUY/SELL/HOLD",
        "entry_price": "harga entry yang direkomendasikan",
        "take_profit": "harga target profit",
        "stop_loss": "harga stop loss",
        "timeframe": "timeframe untuk scalping (1m, 5m, 15m)",
        "risk_reward_ratio": "rasio risk/reward"
      },
      "key_levels": {
        "support": ["level support 1", "level support 2"],
        "resistance": ["level resistance 1", "level resistance 2"]
      },
      "indicators_summary": "Ringkasan sinyal dari semua indikator",
      "risk_warning": "Peringatan risiko jika ada"
    }

    Fokus pada analisis untuk scalping dengan timeframe pendek (1-15 menit).
    `;
  }

  parseAnalysisResponse(response) {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback parsing
      return {
        sentiment: this.extractSentiment(response),
        confidence: this.extractConfidence(response),
        analysis: response,
        recommendation: this.extractRecommendation(response),
        key_levels: this.extractKeyLevels(response),
        indicators_summary: "AI analysis completed",
        risk_warning: "Please verify all signals before trading"
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {
        sentiment: "NEUTRAL",
        confidence: 50,
        analysis: response,
        recommendation: {
          action: "HOLD",
          entry_price: "N/A",
          take_profit: "N/A",
          stop_loss: "N/A",
          timeframe: "5m",
          risk_reward_ratio: "N/A"
        },
        key_levels: {
          support: [],
          resistance: []
        },
        indicators_summary: "AI analysis completed",
        risk_warning: "Please verify all signals before trading"
      };
    }
  }

  extractSentiment(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('bullish') || lowerText.includes('buy') || lowerText.includes('long')) {
      return 'BULLISH';
    } else if (lowerText.includes('bearish') || lowerText.includes('sell') || lowerText.includes('short')) {
      return 'BEARISH';
    }
    return 'NEUTRAL';
  }

  extractConfidence(text) {
    const confidenceMatch = text.match(/(\d+)%/);
    return confidenceMatch ? parseInt(confidenceMatch[1]) : 50;
  }

  extractRecommendation(text) {
    const lowerText = text.toLowerCase();
    let action = 'HOLD';
    
    if (lowerText.includes('buy') || lowerText.includes('long')) {
      action = 'BUY';
    } else if (lowerText.includes('sell') || lowerText.includes('short')) {
      action = 'SELL';
    }

    return {
      action,
      entry_price: "Current market price",
      take_profit: "2-3% above entry",
      stop_loss: "1-2% below entry",
      timeframe: "5m",
      risk_reward_ratio: "1:2"
    };
  }

  extractKeyLevels(text) {
    return {
      support: [],
      resistance: []
    };
  }

  async getRealTimeRecommendation(symbol, currentData) {
    try {
      const prompt = `
      Berikan rekomendasi trading real-time untuk ${symbol}:
      Harga saat ini: ${currentData.price}
      Volume: ${currentData.volume}
      Perubahan: ${currentData.change}
      
      Berikan rekomendasi dalam format JSON:
      {
        "signal": "BUY/SELL/HOLD",
        "strength": "STRONG/MODERATE/WEAK",
        "reason": "Alasan rekomendasi",
        "entry": "Harga entry",
        "target": "Target profit",
        "stop": "Stop loss"
      }
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      try {
        const jsonMatch = response.text().match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : this.parseSimpleRecommendation(response.text());
      } catch (error) {
        return this.parseSimpleRecommendation(response.text());
      }
    } catch (error) {
      console.error('Error getting real-time recommendation:', error);
      return {
        signal: "HOLD",
        strength: "WEAK",
        reason: "AI analysis unavailable",
        entry: "N/A",
        target: "N/A",
        stop: "N/A"
      };
    }
  }

  parseSimpleRecommendation(text) {
    const lowerText = text.toLowerCase();
    let signal = 'HOLD';
    
    if (lowerText.includes('buy')) signal = 'BUY';
    else if (lowerText.includes('sell')) signal = 'SELL';

    return {
      signal,
      strength: "MODERATE",
      reason: text.substring(0, 100) + "...",
      entry: "Current price",
      target: "2-3% above entry",
      stop: "1-2% below entry"
    };
  }
}

module.exports = { GeminiAI };