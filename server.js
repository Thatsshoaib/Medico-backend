const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const { PrismaClient } = require("@prisma/client");

// ✅ SIMPLE & CORRECT (Prisma v5)
const prisma = new PrismaClient();

const app = express();

// CORS
const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
app.use(cors({ origin: allowedOrigins, credentials: true }));

app.use(express.json());

// Prisma middleware
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Routes
const authRoutes = require("./Routes/authRoutes");
const storeRoutes = require("./Routes/storeRoutes");
const mrRoutes = require("./Routes/mrRoutes");
const salesRoutes = require("./Routes/salesRoute");
const attendanceRoute = require("./Routes/attendanceRoute");
const stockRoute = require("./Routes/stockRoutes");
const addressRoute = require("./Routes/addressRoute");

app.use("/api/auth", authRoutes);
app.use("/api/mrs", mrRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/attendance", attendanceRoute);
app.use("/api/stock", stockRoute);
app.use("/api/address", addressRoute);

// Test route
app.get("/api/test", async (req, res) => {
  try {
    const result = await req.prisma.$queryRaw`SELECT 1 as connected`;
    res.json({
      success: true,
      message: "✅ Database connected!",
      result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend
app.use(express.static(path.join(__dirname, "dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await prisma.$connect();
    console.log("✅ DB Connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 http://localhost:${PORT}/api/test`);
    });
  } catch (err) {
    console.error("❌ DB Error:", err);
  }
}

startServer();

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  console.log("Disconnected Prisma");
  process.exit(0);
}); 