const { v4: uuidv4 } = require('uuid');
const express = require('express');
const multer = require('multer');
const { sendToSQS, uploadToS3 } = require('../config/aws');
const authenticateJWT = require("../middleware/authMiddleware");
const { insertDocument } = require('../services/documentService');
const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(), // Store in memory for easy processing
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

/**
 * POST /upload
 * Handles file upload, S3 storage, and SQS queueing
 */
router.post('/upload', authenticateJWT, upload.single('file'), async (req, res) => {
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

module.exports = router;
