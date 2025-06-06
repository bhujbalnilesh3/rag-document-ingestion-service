const { toSql } = require('pgvector/pg');
const pool = require("../db/connection");
const { OpenAI } = require("openai");
const { encoding_for_model } = require("tiktoken");

class QueryService {
  constructor(apiKey, model, llmModel, maxRetries = 3, backoffFactor = 1000) {
    this.openai = new OpenAI({ apiKey });
    this.model = model;
    this.llmModel = llmModel;
    this.maxRetries = maxRetries;
    this.backoffFactor = backoffFactor;
    this.encoder = encoding_for_model(this.model);
  }

  chunkText(text, chunkSize = 200, overlap = 30) {
    const tokens = this.encoder.encode(text);
    const chunks = [];

    let start = 0;
    while (start < tokens.length) {
      const end = Math.min(start + chunkSize, tokens.length);
      const chunkTokens = tokens.slice(start, end);
      const chunkText = new TextDecoder().decode(this.encoder.decode(chunkTokens));
      chunks.push(chunkText);
      start += chunkSize - overlap;
    }

    return chunks;
  }

  async generateEmbedding(content, retries = this.maxRetries) {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: content,
      });

      return response.data[0].embedding;
    } catch (err) {
      console.error(`Embedding error (Attempt ${this.maxRetries - retries + 1}): ${err.message}`);

      if (retries > 0) {
        const waitTime = this.backoffFactor * (this.maxRetries - retries + 1);
        await this.delay(waitTime);
        return this.generateEmbedding(content, retries - 1);
      }

      throw new Error("Embedding generation failed after retries.");
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  averageEmbeddings(vectors) {
    const dim = vectors[0].length;
    const avg = Array(dim).fill(0);
    vectors.forEach(vec => {
      for (let i = 0; i < dim; i++) {
        avg[i] += vec[i];
      }
    });
    return avg.map(val => val / vectors.length);
  }

  async fetchSimilarChunks(embeddingVector, topK = 5) {
    const query = `
    SELECT content, document_id, chunk_index
    FROM embeddings
    ORDER BY embedding <-> $1::vector
    LIMIT $2;
  `;

    const result = await pool.query(query, [toSql(embeddingVector), topK]);
    return result.rows;
  }

  async generateAnswer(query, relevantChunks) {
    // 1. Combine the context
    const contextText = relevantChunks.map((c, i) => `Chunk ${i + 1}:\n${c.content}`).join('\n\n');

    // 2. Create prompt
    const prompt = `
      You are a financial analyst. Based on the following company financial summary, provide a concise summary of its financial health and challenges.
      
      Context:
      ${contextText}

      Question:
      ${query}

      If the answer cannot be found in the context, say "I don't know."
  `;

    // 3. Call LLM
    const completion = await this.openai.chat.completions.create({
      model: process.env.LLM_MODEL,
      messages: [{ role: 'user', content: prompt }],
    });

    // 4. Extract and return answer text
    return completion.choices[0].message.content.trim();
  }
}

module.exports = QueryService;
