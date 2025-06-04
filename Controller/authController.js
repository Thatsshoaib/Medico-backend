const db = require("../Config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const SECRET_KEY = process.env.JWT_SECRET;

// 🟢 REGISTER USER
const registerUser = async (req, res) => {
  const { name, password, role } = req.body;

  console.log("📥 Register attempt:", { name, password, role });

  if (!name || !password || !role) {
    console.log("❌ Missing fields");
    return res.status(400).json({ success: false, message: "Name, password, and role are required" });
  }

  try {
    // Check if admin already exists
    if (role === "admin") {
      const [existingAdminRows] = await db.query("SELECT * FROM users WHERE role = 'admin'");
      console.log("🔍 Existing admin count:", existingAdminRows.length);
      if (existingAdminRows.length > 0) {
        return res.status(400).json({ success: false, message: "Admin already exists" });
      }
    }

    // Check if user already exists by name
    const [existingUserRows] = await db.query("SELECT * FROM users WHERE name = ?", [name]);
    console.log("🔍 Existing user count:", existingUserRows.length);
    if (existingUserRows.length > 0) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert new user
    await db.query("INSERT INTO users (name, password, role) VALUES (?, ?, ?)", [
      name,
      hashedPassword,
      role,
    ]);

    console.log("✅ User registered successfully");
    return res.status(201).json({ success: true, message: `${role} registered successfully` });
  } catch (error) {
    console.error("❌ Error in register:", error.message, error.stack);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


// 🟢 LOGIN USER
const loginUser = async (req, res) => {
  console.log("🔹 Login request received:", req.body);

  const { name, password, role } = req.body;

  if (!name || !password || !role) {
    return res.status(400).json({ success: false, message: "Name, password, and role are required" });
  }

  try {
    const [users] = await db.query("SELECT * FROM users WHERE name = ? AND role = ?", [name, role]);

    if (users.length === 0) {
      return res.status(400).json({ success: false, message: "User not found or incorrect role" });
    }

    const user = users[0];

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect password" });
    }

    // ✅ Ensure correct MR ID is sent
    let mrId = null;
    if (role === "mr") {
      const [mr] = await db.query("SELECT id FROM mrs WHERE name = ?", [name]);

      if (mr.length > 0) {
        mrId = mr[0].id;
      }
    }

    // Generate JWT Token
    const token = jwt.sign({ id: mrId || user.id, role: user.role }, SECRET_KEY, { expiresIn: "1d" });

    res.json({ success: true, message: "Login successful", token, role: user.role, id: mrId || user.id });
  } catch (error) {
    console.error("❌ Error in login:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// 🟢 GET CURRENT MR
const getCurrentMr = async (req, res) => {
  console.log("🔹 Authenticated user:", req.user);

  if (!req.user?.id) {
    return res.status(401).json({ error: "Unauthorized: No user found" });
  }

  const mrId = req.user.id;

  try {
    const [result] = await db.query("SELECT id, name FROM mrs WHERE id = ?", [mrId]);

    if (result.length === 0) {
      return res.status(404).json({ error: "MR not found in database" });
    }

    res.status(200).json(result[0]);
  } catch (error) {
    console.error("❌ Error fetching MR details:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { registerUser, loginUser, getCurrentMr };
