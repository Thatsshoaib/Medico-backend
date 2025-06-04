// routes/attendance.js
const express = require("express");
const router = express.Router();
const db = require("../Config/db"); // Your MySQL connection

router.post("/mark", async (req, res) => {
  const { mr_id, status, photo } = req.body;

  if (!mr_id || !status || !photo) {
    return res.status(400).json({ message: "MR ID, status, and photo are required" });
  }

  try {
    // Check if attendance already marked today
    const [existing] = await db.execute(
      `SELECT * FROM attendance WHERE mr_id = ? AND date = CURRENT_DATE`,
      [mr_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: "Attendance already marked for today" });
    }

    // Insert attendance including photo
    await db.execute(
      `INSERT INTO attendance (mr_id, status, photo) VALUES (?, ?, ?)`,
      [mr_id, status, photo]
    );

    res.status(201).json({ message: "Attendance marked successfully" });
  } catch (error) {
    console.error("Error marking attendance:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// backend route example (add to your attendance routes)
router.get("/status/:mr_id", async (req, res) => {
  const { mr_id } = req.params;
  try {
    const [existing] = await db.execute(
      `SELECT * FROM attendance WHERE mr_id = ? AND DATE(date) = CURDATE()`,
      [mr_id]
    );
    res.json({ attendanceMarked: existing.length > 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get('/history', async (req, res) => {
  try {
    const sql = `
       SELECT 
        a.id, 
        a.mr_id, 
        mrs.name AS mr_name, 
        a.status, 
        a.date,
        a.photo
      FROM attendance a
      JOIN mrs ON a.mr_id = mrs.id
      ORDER BY a.date DESC
    `;

    const [attendance] = await db.query(sql);
    res.status(200).json({ success: true, attendance });
  } catch (error) {
    console.error("❌ Error fetching attendance data:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});


module.exports = router;
