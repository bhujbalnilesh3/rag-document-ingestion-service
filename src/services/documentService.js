const pool = require('../db/connection');

/**
 * Insert document metadata into the database
 * @param {Object} doc - Document metadata
 * @param {string} doc.documentId - Unique document identifier
 * @param {string} doc.s3Key - S3 key of the uploaded file
 * @param {string} doc.title - Original file name
 * @param {string} doc.uploadedBy - User identifier
 * @returns {Promise}
 */
const insertDocument = async ({ documentId, s3Key, title, uploadedBy }) => {
  const query = `
    INSERT INTO documents (id, s3_path, title, uploaded_by)
    VALUES ($1, $2, $3, $4)
  `;
  const values = [documentId, s3Key, title, uploadedBy];

  try {
    await pool.query(query, values);
  } catch (err) {
    console.error('Error inserting document:', err.message);
    throw new Error('Database insertion failed');
  }
};

module.exports = {
  insertDocument,
};
