const express = require("express");
const router = express.Router();
const prisma = require("../Config/prisma");

// ✅ Helper → IST today range
const getTodayRange = () => {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return { start, end, now };
};



// ✅ POST /mark attendance
router.post("/mark", async (req, res) => {
  try {
    const { mr_id, status } = req.body;

    // ✅ Validation
    if (!mr_id || !status) {
      return res.status(400).json({
        message: "MR ID and status are required",
      });
    }

    const mrId = Number(mr_id);

    if (isNaN(mrId)) {
      return res.status(400).json({ message: "Invalid MR ID" });
    }

    // ✅ Validate ENUM
    const validStatus = ["PRESENT", "ABSENT", "LEAVE"];
    const finalStatus = status.toUpperCase();

    if (!validStatus.includes(finalStatus)) {
      return res.status(400).json({
        message: "Invalid status (PRESENT, ABSENT, LEAVE)",
      });
    }

    // ✅ Check MR exists
    const mr = await prisma.mR.findUnique({
      where: { id: mrId },
    });

    if (!mr) {
      return res.status(404).json({ message: "MR not found" });
    }

    const { start, end, now } = getTodayRange();

    // ✅ Check today's attendance
    const existing = await prisma.attendance.findFirst({
      where: {
        mrId: mrId,
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    if (existing) {
      return res.status(409).json({
        message: "Attendance already marked for today",
      });
    }

    // ✅ Create attendance
    const newAttendance = await prisma.attendance.create({
      data: {
        mrId: mrId,
        status: finalStatus,
        date: now,
        checkInTime: now,
      },
    });

    res.status(201).json({
      message: "Attendance marked successfully",
      data: newAttendance,
    });

  } catch (error) {
    console.error("Error marking attendance:", error);

    // ✅ Unique constraint safety
    if (error.code === "P2002") {
      return res.status(409).json({
        message: "Attendance already marked",
      });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});



// ✅ GET /status/:mr_id
router.get("/status/:mr_id", async (req, res) => {
  try {
    const mrId = Number(req.params.mr_id);

    if (isNaN(mrId)) {
      return res.status(400).json({ message: "Invalid MR ID" });
    }

    const { start, end } = getTodayRange();

    const existing = await prisma.attendance.findFirst({
      where: {
        mrId: mrId,
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    res.json({
      attendanceMarked: !!existing,
      data: existing || null,
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});



// ✅ GET /history
router.get("/history", async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const attendance = await prisma.attendance.findMany({
      skip: (page - 1) * limit,
      take: Number(limit),
      include: {
        mr: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    const formatted = attendance.map((a) => ({
      id: a.id,
      mr_id: a.mrId,
      mr_name: a.mr?.name || null,
      status: a.status,
      date: a.date,
      checkInTime: a.checkInTime,
      checkOutTime: a.checkOutTime,
    }));

    res.status(200).json({
      success: true,
      attendance: formatted,
    });

  } catch (error) {
    console.error("❌ Error fetching attendance:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});



module.exports = router;