const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

BigInt.prototype.toJSON = function () {
  return this.toString();
};

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const app = express();

/* ================================
   ✅ CORS FIX (FINAL WORKING)
================================ */
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://medic.ruglens.com",
  "https://medic.ruglens.com",
  "https://medico-sandy-seven.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow tools like Postman
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.includes(origin) ||
        origin?.endsWith(".ruglens.com") // 🔥 subdomain support
      ) {
        return callback(null, true);
      } else {
        console.log("❌ Blocked by CORS:", origin);
        return callback(null, false); // don't crash server
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

/* ================================
   Middleware
================================ */
app.use(express.json());

app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

/* ================================
   Routes
================================ */
const authRoutes = require("./Routes/authRoutes");
const storeRoutes = require("./Routes/storeRoutes");
const mrRoutes = require("./Routes/mrRoutes");
const salesRoutes = require("./Routes/salesRoute");
const attendanceRoute = require("./Routes/attendanceRoute");
const stockRoute = require("./Routes/stockRoutes");
const addressRoute = require("./Routes/addressRoute");
const uploadRoute = require("./Routes/uploadRoute");
const salaryRoutes = require("./Routes/salaryRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/mrs", mrRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/attendance", attendanceRoute);
app.use("/api/stock", stockRoute);
app.use("/api/address", addressRoute);
app.use("/api", uploadRoute);
app.use("/api/salary", salaryRoutes);

/* ================================
   Test Route
================================ */
app.get("/api/test", async (req, res) => {
  try {
    const result = await req.prisma.$queryRaw`SELECT 1 as connected`;

    res.json({
      success: true,
      message: "DB Connected",
      result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================================
   Start Server
================================ */
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await prisma.$connect();
    console.log("✅ DB Connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on ${PORT}`);
    });
  } catch (err) {
    console.error("❌ DB Error:", err);
  }
}

startServer();

/* ================================
   Graceful Shutdown
================================ */
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});