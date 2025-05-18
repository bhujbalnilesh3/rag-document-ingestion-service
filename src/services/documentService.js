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
const insertDocument = async ({ documentId, title, uploadedBy }) => {
  const query = `
    INSERT INTO documents (id, title, uploaded_by)
    VALUES ($1, $2, $3)
  `;
  const values = [documentId, title, uploadedBy];

  try {
    await pool.query(query, values);
  } catch (err) {
    console.error('Error inserting document:', err.message);
    throw new Error('Database insertion failed');
  }
};

/**
 * List all uploaded documents
 * @returns {Promise<Array>} - List of documents
 */
const listDocuments = async () => {
  const query = `
    SELECT id AS documentId, title, uploaded_by, created_at, processed
    FROM documents
    ORDER BY created_at DESC;
  `;

  try {
    const { rows } = await pool.query(query);
    return rows;
  } catch (err) {
    console.error("Error fetching documents:", err.message);
    throw new Error("Failed to fetch documents");
  }
};

/**
 * Get document by ID
 * @param {string} documentId - The ID of the document
 * @returns {Promise<Object|null>} - Document data or null if not found
 */
const getDocumentById = async (documentId) => {
  const query = `
    SELECT id AS documentId, title  
    FROM documents 
    WHERE id = $1;
  `;

  try {
    const { rows } = await pool.query(query, [documentId]);
    return rows.length ? rows[0] : null;
  } catch (err) {
    console.error("Error fetching document by ID:", err.message);
    throw new Error("Failed to fetch document");
  }
};

/**
 * Delete a document and its related embeddings
 * @param {string} documentId - Document ID
 * @returns {Promise<void>}
 */
const deleteDocumentAndEmbeddings = async (documentId) => {
  try {
    await pool.query("BEGIN");

    // Delete embeddings
    const deleteEmbeddingsQuery = `DELETE FROM embeddings WHERE id = $1`;
    const embeddingsResult = await pool.query(deleteEmbeddingsQuery, [documentId]);

    // Delete document
    const deleteDocumentQuery = `DELETE FROM documents WHERE id = $1`;
    const documentResult = await pool.query(deleteDocumentQuery, [documentId]);

    if (embeddingsResult.rowCount === 0 || documentResult.rowCount === 0) {
      throw new Error("Document not found either in document or embeddings table");
    }

    await pool.query("COMMIT");
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Error deleting document and embeddings:", err.message);
    throw new Error("Failed to delete document and embeddings");
  }
};

module.exports = {
  insertDocument,
  listDocuments,
  deleteDocumentAndEmbeddings,
  getDocumentById,
};
