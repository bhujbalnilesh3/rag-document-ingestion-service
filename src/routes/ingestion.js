const { v4: uuidv4 } = require('uuid');
const express = require('express');
const { sendToSQS, uploadToS3, deleteFromS3 } = require('../config/aws');
const authenticateJWT = require("../middleware/authMiddleware");
const uploadMiddleware = require("../middleware/uploadMiddleware");
const { insertDocument, listDocuments, deleteDocumentAndEmbeddings } = require('../services/documentService');
const router = express.Router();

/**
 * POST /upload
 * Handles file upload, S3 storage, and SQS queueing
 */
router.post('/upload', authenticateJWT, uploadMiddleware, async (req, res) => {
  const { title, uploadedBy } = req.body;
  const file = req.file;

  if (!file || !title || !uploadedBy) {
    return res.status(400).json({ error: 'File, title, and uploadedBy are required' });
  }

  const documentId = uuidv4();
  const s3Key = `${documentId}.pdf`;

  try {
    // Upload to S3
    await uploadToS3(file.buffer, s3Key);

    // Insert document metadata into the database
    await insertDocument({ documentId, s3Key, title: file.originalname, uploadedBy });

    // Queue processing task
    const sqsResult = await sendToSQS({ documentId, s3Key, title: file.originalname });

    res.status(200).json({
      message: 'Document uploaded and processing started',
      jobId: documentId,
      sqsMessageId: sqsResult.MessageId,
    });

  } catch (err) {
    console.error('Error in /upload route:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /documents
 * Retrieves all uploaded documents
 */
router.get("/documents", authenticateJWT, async (req, res) => {
  try {
    const documents = await listDocuments();
    res.status(200).json(documents);
  } catch (err) {
    console.error("Error in /documents route:", err.message);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

router.delete("/documents/:id", authenticateJWT, async (req, res) => {
  const documentId = req.params.id;

  try {
    // Delete from S3
    await deleteFromS3(documentId);

    // Delete from DB
    await deleteDocumentAndEmbeddings(documentId);

    res.status(200).json({ message: "Document deleted successfully" });
  } catch (err) {
    console.error("Error in /documents/:id route:", err.message);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

module.exports = router;
