const express = require("express");
const router = express.Router();
const authenticateJWT = require("../middleware/authMiddleware");
const QueryService = require("../services/queryService");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL;
const LLM_MODEL = process.env.LLM_MODEL;

router.post("/query", authenticateJWT, async (req, res) => {
  try {
    const query = req.body.query;
    const documentsIds = req.body.documentsIds;

    const queryService = new QueryService(OPENAI_API_KEY, EMBEDDING_MODEL, LLM_MODEL);
    const chunks = queryService.chunkText(query, 200, 30);

    const embeddings = [];

    for (const chunk of chunks) {
      const result = await queryService.generateEmbedding(chunk);
      embeddings.push(result);
    }

    const avgEmbedding = queryService.averageEmbeddings(embeddings);
    const matchedChunks = await queryService.fetchSimilarChunks(avgEmbedding, 5);

    const answer = await queryService.generateAnswer(query, matchedChunks);

    res.status(200).json({
      query,
      answer,
      documentsIds,
      matchedChunks,
    });
  } catch (err) {
    console.error("Query processing error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
