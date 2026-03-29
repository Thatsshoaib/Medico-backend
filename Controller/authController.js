const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const SECRET_KEY = process.env.JWT_SECRET;

// 🟢 REGISTER USER
const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;  // ← ADD email here

  console.log("📥 Register attempt:", { name, email, password, role });  // ← Log email

  if (!name || !password || !role) {
    console.log("❌ Missing fields");
    return res.status(400).json({ success: false, message: "Name, password, and role are required" });
  }

  try {
    const prisma = req.prisma;

    // Check if admin already exists
    if (role === "admin") {
      const existingAdmin = await prisma.user.findFirst({
        where: { role: "admin" }
      });
      
      console.log("🔍 Existing admin:", existingAdmin ? "Yes" : "No");
      if (existingAdmin) {
        return res.status(400).json({ success: false, message: "Admin already exists" });
      }
    }

    // Check if user already exists by name
    const existingUser = await prisma.user.findFirst({
      where: { name: name }
    });
    
    console.log("🔍 Existing user:", existingUser ? "Yes" : "No");
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Check if email already exists (if email is provided)
    if (email) {
      const existingEmail = await prisma.user.findFirst({
        where: { email: email }
      });
      
      if (existingEmail) {
        return res.status(400).json({ success: false, message: "Email already exists" });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert new user - include email
    const newUser = await prisma.user.create({
      data: {
        name,
        email: email || null,  // ← ADD email here
        password: hashedPassword,
        role
      }
    });

    console.log("✅ User registered successfully");
    return res.status(201).json({ 
      success: true, 
      message: `${role} registered successfully`,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
    });
  } catch (error) {
    console.error("❌ Error in register:", error.message);
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
    const prisma = req.prisma;
    
    // Find user by name and role
    const user = await prisma.user.findFirst({
      where: {
        name: name,
        role: role
      }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "User not found or incorrect role" });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect password" });
    }

    // ✅ Ensure correct MR ID is sent
    let mrId = null;
    if (role === "mr") {
      const mr = await prisma.mR.findFirst({
        where: { name: name },
        select: { id: true }
      });

      if (mr) {
        mrId = mr.id;
      }
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: mrId || user.id, role: user.role, name: user.name }, 
      SECRET_KEY, 
      { expiresIn: "1d" }
    );

    res.json({ 
      success: true, 
      message: "Login successful", 
      token, 
      role: user.role, 
      id: mrId || user.id,
      name: user.name
    });
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
    const prisma = req.prisma;
    const mr = await prisma.mR.findUnique({
      where: { id: mrId },
      select: { id: true, name: true, email: true, phone: true }
    });

    if (!mr) {
      return res.status(404).json({ error: "MR not found in database" });
    }

    res.status(200).json(mr);
  } catch (error) {
    console.error("❌ Error fetching MR details:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// 🟢 AUTHENTICATE MIDDLEWARE
const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

module.exports = { registerUser, loginUser, getCurrentMr, authenticateUser };