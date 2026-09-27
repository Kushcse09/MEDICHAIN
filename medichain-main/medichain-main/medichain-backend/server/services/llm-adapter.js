/**
 * MediChain Shield - LLM Adapter
 * 
 * Multi-provider adapter with zero-cost fallback strategy:
 * 1. Google Gemini Free Tier (15 RPM, no credit card)
 * 2. Groq Free Tier (30 RPM, no credit card)
 * 3. Local Heuristic Engine (rule-based, infinite free)
 * 
 * All providers return normalized response format.
 */

import crypto from "crypto";

/**
 * Response cache for deduplication
 */
class ResponseCache {
  constructor(ttl = 3600000) {
    // 1 hour
    this.cache = new Map();
    this.ttl = ttl;
  }

  _hash(systemPrompt, userPrompt) {
    const combined = `${systemPrompt}|||${userPrompt}`;
    return crypto.createHash("sha256").update(combined).digest("hex");
  }

  get(systemPrompt, userPrompt) {
    const key = this._hash(systemPrompt, userPrompt);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.response;
  }

  set(systemPrompt, userPrompt, response) {
    const key = this._hash(systemPrompt, userPrompt);
    this.cache.set(key, {
      response,
      expiresAt: Date.now() + this.ttl,
    });
  }

  clear() {
    this.cache.clear();
  }
}

/**
 * Base LLM Provider
 */
class LLMProvider {
  constructor(name) {
    this.name = name;
    this.available = false;
  }

  async complete(systemPrompt, userPrompt) {
    throw new Error("Not implemented");
  }

  isAvailable() {
    return this.available;
  }
}

/**
 * Google Gemini Free Tier Provider
 */
class GeminiProvider extends LLMProvider {
  constructor(apiKey) {
    super("Google Gemini");
    this.apiKey = apiKey;
    this.model = "gemini-1.5-flash";
    this.endpoint = "https://generativelanguage.googleapis.com/v1beta/models";
    this.available = !!apiKey;

    if (!apiKey) {
      console.warn(
        "[WARN] Gemini API key not provided. Set GEMINI_API_KEY in .env"
      );
    }
  }

  async complete(systemPrompt, userPrompt) {
    if (!this.available) {
      throw new Error("Gemini provider not available (missing API key)");
    }

    try {
      const url = `${this.endpoint}/${this.model}:generateContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\n${userPrompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      const content =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No response generated";

      // Estimate tokens (rough approximation)
      const tokensUsed = Math.ceil(
        (systemPrompt.length + userPrompt.length + content.length) / 4
      );

      return {
        content,
        tokensUsed,
        provider: this.name,
        model: this.model,
      };
    } catch (error) {
      console.error("Gemini API error:", error.message);
      throw error;
    }
  }
}

/**
 * Groq Free Tier Provider
 */
class GroqProvider extends LLMProvider {
  constructor(apiKey) {
    super("Groq");
    this.apiKey = apiKey;
    this.model = "llama-3.3-70b-versatile";
    this.endpoint = "https://api.groq.com/openai/v1/chat/completions";
    this.available = !!apiKey;

    if (!apiKey) {
      console.warn("[WARN] Groq API key not provided. Set GROQ_API_KEY in .env");
    }
  }

  async complete(systemPrompt, userPrompt) {
    if (!this.available) {
      throw new Error("Groq provider not available (missing API key)");
    }

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
          temperature: 0.1,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      const content = data.choices?.[0]?.message?.content || "No response generated";
      const tokensUsed = data.usage?.total_tokens || 0;

      return {
        content,
        tokensUsed,
        provider: this.name,
        model: this.model,
      };
    } catch (error) {
      console.error("Groq API error:", error.message);
      throw error;
    }
  }
}

/**
 * Local Heuristic Engine (Rule-based fallback)
 */
class LocalHeuristicProvider extends LLMProvider {
  constructor() {
    super("Local Heuristics");
    this.available = true;

    // Drug interaction database (simplified)
    this.interactions = {
      warfarin: [
        {
          drug: "aspirin",
          severity: "high",
          interaction: "Increased bleeding risk",
        },
        {
          drug: "ibuprofen",
          severity: "high",
          interaction: "Increased bleeding risk",
        },
        {
          drug: "vitamin k",
          severity: "medium",
          interaction: "Reduced anticoagulation effect",
        },
      ],
      "ace inhibitors": [
        {
          drug: "potassium",
          severity: "high",
          interaction: "Hyperkalemia risk",
        },
        { drug: "nsaids", severity: "medium", interaction: "Reduced efficacy" },
      ],
      ssri: [
        { drug: "nsaids", severity: "medium", interaction: "Bleeding risk" },
        {
          drug: "tramadol",
          severity: "high",
          interaction: "Serotonin syndrome risk",
        },
      ],
      metformin: [
        {
          drug: "alcohol",
          severity: "high",
          interaction: "Lactic acidosis risk",
        },
      ],
      statins: [
        {
          drug: "grapefruit",
          severity: "medium",
          interaction: "Increased statin levels",
        },
      ],
    };
  }

  async complete(systemPrompt, userPrompt) {
    // Extract medications from prompt
    const medications = this._extractMedications(userPrompt);

    // Find interactions
    const interactions = this._findInteractions(medications);

    // Determine severity
    const severity = this._calculateSeverity(interactions);

    const result = {
      interactions: interactions.map((i) => i.description),
      severity,
      confidence: 0.6, // Lower confidence for heuristic engine
      notes: `Analysis performed by local heuristic engine. ${medications.length} medications checked against ${Object.keys(this.interactions).length} interaction rules.`,
    };

    return {
      content: JSON.stringify(result, null, 2),
      tokensUsed: 0,
      provider: this.name,
      model: "rule-based",
    };
  }

  _extractMedications(text) {
    const lowerText = text.toLowerCase();
    const found = [];

    // Check against known drug classes and names
    for (const drug of Object.keys(this.interactions)) {
      if (lowerText.includes(drug)) {
        found.push(drug);
      }
    }

    // Extract from untrusted tags
    const medMatch = text.match(
      /<untrusted_medications>(.*?)<\/untrusted_medications>/s
    );
    if (medMatch) {
      const meds = medMatch[1].split(/[,\n]/).map((m) => m.trim().toLowerCase());
      found.push(...meds);
    }

    return [...new Set(found)];
  }

  _findInteractions(medications) {
    const interactions = [];

    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        const med1 = medications[i];
        const med2 = medications[j];

        // Check if med1 has known interactions with med2
        if (this.interactions[med1]) {
          for (const interaction of this.interactions[med1]) {
            if (med2.includes(interaction.drug) || interaction.drug.includes(med2)) {
              interactions.push({
                description: `${med1} + ${med2}: ${interaction.interaction}`,
                severity: interaction.severity,
              });
            }
          }
        }

        // Check reverse
        if (this.interactions[med2]) {
          for (const interaction of this.interactions[med2]) {
            if (med1.includes(interaction.drug) || interaction.drug.includes(med1)) {
              interactions.push({
                description: `${med2} + ${med1}: ${interaction.interaction}`,
                severity: interaction.severity,
              });
            }
          }
        }
      }
    }

    return interactions;
  }

  _calculateSeverity(interactions) {
    if (interactions.length === 0) return "none";

    const hasHigh = interactions.some((i) => i.severity === "high");
    const hasMedium = interactions.some((i) => i.severity === "medium");

    if (hasHigh) return "high";
    if (hasMedium) return "medium";
    return "low";
  }
}

/**
 * LLM Adapter with multi-provider support
 */
class LLMAdapter {
  constructor() {
    this.cache = new ResponseCache();

    // Initialize providers in priority order
    this.providers = [
      new GeminiProvider(process.env.GEMINI_API_KEY),
      new GroqProvider(process.env.GROQ_API_KEY),
      new LocalHeuristicProvider(),
    ];

    const availableProviders = this.providers
      .filter((p) => p.isAvailable())
      .map((p) => p.name);

    console.log(`LLM Adapter initialized with providers: ${availableProviders.join(", ")}`);
  }

  /**
   * Completes a prompt using the first available provider
   */
  async complete(systemPrompt, userPrompt) {
    // Check cache first
    const cached = this.cache.get(systemPrompt, userPrompt);
    if (cached) {
      console.log("Cache hit");
      return { ...cached, cached: true };
    }

    // Try each provider in order
    for (const provider of this.providers) {
      if (!provider.isAvailable()) {
        continue;
      }

      try {
        console.log(`Attempting ${provider.name}...`);
        const response = await provider.complete(systemPrompt, userPrompt);

        // Cache successful response
        this.cache.set(systemPrompt, userPrompt, response);

        console.log(
          `${provider.name} success (${response.tokensUsed} tokens)`
        );
        return { ...response, cached: false };
      } catch (error) {
        console.warn(`[WARN] ${provider.name} failed:`, error.message);
        // Continue to next provider
      }
    }

    throw new Error("All LLM providers failed");
  }

  /**
   * Gets status of all providers
   */
  getStatus() {
    return this.providers.map((p) => ({
      name: p.name,
      available: p.isAvailable(),
      model: p.model || "N/A",
    }));
  }

  /**
   * Clears response cache
   */
  clearCache() {
    this.cache.clear();
  }
}

/**
 * Singleton instance
 */
let instance = null;

export function getLLMAdapter() {
  if (!instance) {
    instance = new LLMAdapter();
  }
  return instance;
}

export default LLMAdapter;
