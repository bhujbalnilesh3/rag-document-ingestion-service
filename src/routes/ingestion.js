const { v4: uuidv4 } = require('uuid');
const express = require('express');
const { sendToSQS, uploadToS3, deleteFromS3, downloadFromS3 } = require('../config/aws');
const authenticateJWT = require("../middleware/authMiddleware");
const uploadMiddleware = require("../middleware/uploadMiddleware");
const { insertDocument, listDocuments, deleteDocumentAndEmbeddings, getDocumentById } = require('../services/documentService');
const router = express.Router();

/**
 * POST /upload
 * Handles file upload, S3 storage, and SQS queueing
 */
router.post('/upload', authenticateJWT, uploadMiddleware, async (req, res) => {
  const { title } = req.body;
  const file = req.file;

  if (!file || !title) {
    return res.status(400).json({ error: 'File and title are required' });
  }

  const documentId = uuidv4();

  const uploadedBy = req.user.username;

  try {
    // Upload to S3
    await uploadToS3(file.buffer, documentId, title);

    // Insert document metadata into the database
    await insertDocument({ documentId, title, uploadedBy });

    // Queue processing task
    const sqsResult = await sendToSQS({ documentId, title });

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

/**
 * GET /download/:documentId
 * Downloads a document from S3 by documentId
 */
router.get('/download/:documentId', authenticateJWT, async (req, res) => {
  const { documentId } = req.params;

  if (!documentId) {
    return res.status(400).json({ error: 'Document ID is required' });
  }

  try {
    // Fetch document metadata from the database
    const document = await getDocumentById(documentId);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    let { documentid, title } = document;
    s3key = documentid + '/' + title + '.pdf';

    const s3Stream = await downloadFromS3(s3key);

    res.setHeader('Content-Disposition', `attachment; filename="${title}.pdf"`);
    res.setHeader('Content-Type', 'application/pdf');

    s3Stream.pipe(res);
  } catch (err) {
    console.error('Error in /download route:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
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
