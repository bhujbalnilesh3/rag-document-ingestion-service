const { v4: uuidv4 } = require('uuid');
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getUserByEmail, insertUser } = require("../services/userService");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION;  // Token expiry duration
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;

/**
 * POST /api/users/login
 * Authenticate user and return JWT token
 */
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        // Fetch user by email
        const user = await getUserByEmail(email);

        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Generate JWT token
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });

        res.status(200).json({ message: "Login successful", token });
    } catch (err) {
        console.error("Login error:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

/**
 * POST /api/users/register
 * Register a new user
 */
router.post("/register", async (req, res) => {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
        return res.status(400).json({ error: "All fields are required" });
    }

    // Validate role
    const validRoles = ["admin", "editor", "viewer"];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
    }

    try {
        // Check if user already exists
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: "User with this email already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Create user
        const userId = uuidv4();
        await insertUser({ id: userId, username, email, password: hashedPassword, role });

        res.status(201).json({ message: "User registered successfully", userId });
    } catch (err) {
        console.error("Registration error:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
