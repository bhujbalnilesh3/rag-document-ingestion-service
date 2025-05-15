const pool = require("../db/connection");

/**
 * Fetch user by email
 * @param {string} email - User email
 * @returns {Promise<Object>} - User object
 */
const getUserByEmail = async (email) => {
    try {
        const query = `SELECT * FROM "rag-users" WHERE email = $1;`;
        const { rows } = await pool.query(query, [email]);
        return rows[0];
    } catch (err) {
        console.error("Error fetching user by email:", err.message);
        throw new Error("Database query failed");
    }
};

/**
 * Insert a new user into the database
 * @param {Object} user - User details
 */
const insertUser = async ({ id, username, email, password, role }) => {
    const query = `
      INSERT INTO "rag-users" (id, username, email, password, role)
      VALUES ($1, $2, $3, $4, $5)
    `;
    const values = [id, username, email, password, role];

    try {
        await pool.query(query, values);
    } catch (err) {
        console.error("Error inserting user:", err.message);
        throw new Error("Database insertion failed");
    }
};


module.exports = {
    getUserByEmail,
    insertUser,
};
