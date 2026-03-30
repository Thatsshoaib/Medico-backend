const express = require("express");
const router = express.Router();
const prisma = require('../Config/prisma');
// Helper → today start & end
const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

// POST /mark
router.post("/mark", async (req, res) => {
  try {
    const { mr_id, status, photo } = req.body;

    // ✅ Validation
    if (!mr_id || !status || !photo) {
      return res.status(400).json({
        message: "MR ID, status, and photo are required",
      });
    }

    // ✅ Check MR exists (important security)
    const mr = await prisma.mR.findUnique({
      where: { id: Number(mr_id) }
    });

    if (!mr) {
      return res.status(404).json({ message: "MR not found" });
    }

    // ✅ Check today's attendance
    const { start, end } = getTodayRange();

    const existing = await prisma.attendance.findFirst({
      where: {
        mr_id: Number(mr_id),
        date: {
          gte: start,
          lte: end
        }
      }
    });

    if (existing) {
      return res.status(409).json({
        message: "Attendance already marked for today"
      });
    }

    // ✅ Create attendance
    const newAttendance = await prisma.attendance.create({
      data: {
        mr_id: Number(mr_id),
        status,
        photo
      }
    });

    res.status(201).json({
      message: "Attendance marked successfully",
      data: newAttendance
    });

  } catch (error) {
    console.error("Error marking attendance:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// GET /status/:mr_id
router.get("/status/:mr_id", async (req, res) => {
  try {
    const mr_id = Number(req.params.mr_id);

    const { start, end } = getTodayRange();

    const existing = await prisma.attendance.findFirst({
      where: {
        mr_id,
        date: {
          gte: start,
          lte: end
        }
      }
    });

    res.json({ attendanceMarked: !!existing });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// GET /history
router.get("/history", async (req, res) => {
  try {
    const attendance = await prisma.attendance.findMany({
      include: {
        mr: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        date: "desc"
      }
    });

    // Format response like your old API
    const formatted = attendance.map(a => ({
      id: a.id,
      mr_id: a.mr_id,
      mr_name: a.mr.name,
      status: a.status,
      date: a.date,
      photo: a.photo
    }));

    res.status(200).json({
      success: true,
      attendance: formatted
    });

  } catch (error) {
    console.error("❌ Error fetching attendance:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
});

module.exports = router;