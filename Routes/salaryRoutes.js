const express = require("express");
const router = express.Router();

/* =========================
   HELPER → MONTH RANGE
========================= */
const getMonthRange = (month, year) => {
  const m = Number(month);
  const y = Number(year);

  if (!m || !y) return null;

  const start = new Date(y, m - 1, 1);

  const today = new Date();

  const isCurrentMonth =
    m === today.getMonth() + 1 &&
    y === today.getFullYear();

  const end = isCurrentMonth
    ? today
    : new Date(y, m, 0, 23, 59, 59);

  return { start, end, isCurrentMonth };
};

/* =========================
   CALCULATE SALARY
========================= */
router.get("/calculate", async (req, res) => {
  try {
    const prisma = req.prisma;
    const { month, year } = req.query;

    const range = getMonthRange(month, year);

    if (!range) {
      return res.status(400).json({ error: "Invalid month/year" });
    }

    const { start, end, isCurrentMonth } = range;

    const mrs = await prisma.mR.findMany({
      include: {
        attendance: {
          where: {
            date: {
              gte: start,
              lte: end,
            },
          },
        },
      },
    });

    const result = mrs.map((mr) => {
      const baseSalary = mr.salary || 0;

      let presentDays = 0;
      let absentDays = 0;
      let leaveDays = 0;

      // ✅ attendance count
      mr.attendance.forEach((a) => {
        if (a.status === "PRESENT") presentDays++;
        if (a.status === "ABSENT") absentDays++;
        if (a.status === "LEAVE") leaveDays++;
      });

      // ✅ sunday count (ONLY till today if current month)
      let sundayCount = 0;

      const today = new Date();
      const lastDay = isCurrentMonth
        ? today.getDate()
        : new Date(year, month, 0).getDate();

      for (let d = 1; d <= lastDay; d++) {
        const day = new Date(year, month - 1, d).getDay();
        if (day === 0) sundayCount++;
      }

      // ✅ total days (always full month)
      const totalDays = new Date(year, month, 0).getDate();

      const perDaySalary = Math.round(baseSalary / totalDays);

      // ✅ paid days
      const paidDays = presentDays + sundayCount;

      // ✅ deduction (only absent + leave)
      const deduction = (absentDays + leaveDays) * perDaySalary;

      const finalSalary = paidDays * perDaySalary;

      return {
        mrId: mr.id,
        name: mr.name,
        baseSalary,
        presentDays,
        absentDays,
        leaveDays,
        sundayCount,
        paidDays,
        perDaySalary,
        deduction,
        finalSalary,
        isLive: isCurrentMonth, // 👈 important
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;