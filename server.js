const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

// ✅ 🔥 FIX BigInt serialization
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const { PrismaClient } = require("@prisma/client");

// ✅ Prisma Client
const prisma = new PrismaClient();

const app = express();

// ✅ CORS CONFIG (FINAL FIX)
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://medico-sandy-seven.vercel.app" // 🔥 VERCEL FRONTEND
];

app.use(
  cors({
    origin: function (origin, callback) {
      // ✅ allow Postman / mobile apps (no origin)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("❌ Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// ✅ Handle preflight requests (IMPORTANT)
app.options("*", cors());

// ✅ Middleware
app.use(express.json());

// ✅ Prisma middleware
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// ✅ Routes
const authRoutes = require("./Routes/authRoutes");
const storeRoutes = require("./Routes/storeRoutes");
const mrRoutes = require("./Routes/mrRoutes");
const salesRoutes = require("./Routes/salesRoute");
const attendanceRoute = require("./Routes/attendanceRoute");
const stockRoute = require("./Routes/stockRoutes");
const addressRoute = require("./Routes/addressRoute");
const uploadRoute = require("./Routes/uploadRoute");



app.use("/api/auth", authRoutes);
app.use("/api/mrs", mrRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/attendance", attendanceRoute);
app.use("/api/stock", stockRoute);
app.use("/api/address", addressRoute);
app.use("/api", uploadRoute);
// ✅ Test route
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

// ✅ Serve frontend (optional)
app.use(express.static(path.join(__dirname, "dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ✅ Start server
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

// ✅ Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  console.log("Disconnected Prisma");
  process.exit(0);
});