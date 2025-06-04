const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path"); // <-- Required to resolve paths

// Load environment variables
dotenv.config();

const app = express();

// ✅ Configure CORS (Allows multiple origins if needed)
const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"]; 
app.use(cors({ origin: allowedOrigins, credentials: true }));

// ✅ Middleware
app.use(express.json()); // Parse JSON request body

// ✅ Import Routes
const authRoutes = require("./Routes/authRoutes");
const storeRoutes = require("./Routes/storeRoutes");
const mrRoutes = require("./Routes/mrRoutes");
const salesRoutes = require("./Routes/salesRoute");
const attendanceRoute = require("./Routes/attendanceRoute");
const stockRoute = require("./Routes/stockRoutes");
const addressRoute = require("./Routes/addressRoute");

// ✅ Use Routes
app.use("/api/auth", authRoutes);
app.use("/api/mrs", mrRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/attendance", attendanceRoute);
app.use("/api/stock", stockRoute);
app.use("/api/address", addressRoute);

// ✅ Serve frontend from 'dist' in production
app.use(express.static(path.join(__dirname, "dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log("✅ SQL connected successfully");
});
