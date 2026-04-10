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

// ✅ POST /mark attendance (WITH PHOTO)
router.post("/mark", async (req, res) => {
  try {
    const { mr_id, status, photoUrl } = req.body;

    // ✅ Validate required fields
    if (!mr_id || !status) {
      return res.status(400).json({
        message: "MR ID and status are required",
      });
    }

    // ✅ Validate photo is mandatory
    if (!photoUrl) {
      return res.status(400).json({
        message: "Photo is mandatory for marking attendance",
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

    // ✅ Create attendance WITH photoUrl
    const newAttendance = await prisma.attendance.create({
      data: {
        mrId: mrId,
        status: finalStatus,
        date: now,
        checkInTime: now,
        photoUrl: photoUrl, // ✅ SAVE PHOTO URL
      },
    });

    res.status(201).json({
      message: "Attendance marked successfully",
      success: true,
      data: newAttendance,
    });
  } catch (error) {
    console.error("Error marking attendance:", error);

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

// ✅ GET /history/:mr_id - Sirf specific MR ki attendance
router.get("/history/:mr_id", async (req, res) => {
  try {
    const mrId = Number(req.params.mr_id);
    const { page = 1, limit = 10 } = req.query;

    if (isNaN(mrId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid MR ID",
      });
    }

    const mr = await prisma.mR.findUnique({
      where: { id: mrId },
    });

    if (!mr) {
      return res.status(404).json({
        success: false,
        message: "MR not found",
      });
    }

    const total = await prisma.attendance.count({
      where: { mrId: mrId },
    });

    const attendance = await prisma.attendance.findMany({
      where: { mrId: mrId },
      skip: (page - 1) * Number(limit),
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
      photoUrl: a.photoUrl, // ✅ Include photo URL in response
    }));

    res.status(200).json({
      success: true,
      attendance: formatted,
      total: total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error("❌ Error fetching MR attendance:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// ✅ GET /history - All attendance (with optional mr_id filter)
router.get("/history", async (req, res) => {
  try {
    const { page = 1, limit = 10, mr_id } = req.query;

    let whereClause = {};
    if (mr_id) {
      whereClause.mrId = Number(mr_id);
    }

    const total = await prisma.attendance.count({
      where: whereClause,
    });

    const attendance = await prisma.attendance.findMany({
      where: whereClause,
      skip: (page - 1) * Number(limit),
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
      photoUrl: a.photoUrl, // ✅ Include photo URL in response
    }));

    res.status(200).json({
      success: true,
      attendance: formatted,
      total: total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
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