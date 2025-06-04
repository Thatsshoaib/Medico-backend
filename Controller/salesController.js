const db = require("../Config/db");

// ✅ Add a Single Sale
const addSales = async (req, res) => {
  try {
    const { mr_id, store_id, medicine_name, quantity, price, date } = req.body;

    if (!mr_id || !store_id || !medicine_name || !quantity || !price || !date) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const today = new Date().toISOString().split("T")[0];
    if (date > today) {
      return res
        .status(400)
        .json({ success: false, message: "Date cannot be in the future" });
    }

    const sql = `INSERT INTO sales (mr_id, store_id, medicine_name, quantity, price, date) VALUES (?, ?, ?, ?, ?, ?)`;
    await db.query(sql, [
      mr_id,
      store_id,
      medicine_name,
      quantity,
      price,
      date,
    ]);

    res
      .status(201)
      .json({ success: true, message: "Sales record added successfully" });
  } catch (error) {
    console.error("Error adding sales record:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ✅ Add Bulk Sales
const addBulkSales = async (req, res) => {
  try {
    const salesArray = req.body;

    if (!Array.isArray(salesArray) || salesArray.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Sales data must be a non-empty array",
        });
    }

    const today = new Date().toISOString().split("T")[0];
    const values = [];

    for (let sale of salesArray) {
      const { mr_id, store_id, medicine_name, quantity, price, date } = sale;

      if (
        !mr_id ||
        !store_id ||
        !medicine_name ||
        !quantity ||
        !price ||
        !date
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message: "All fields are required in each sale",
          });
      }

      if (date > today) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Sale date cannot be in the future",
          });
      }

      values.push([mr_id, store_id, medicine_name, quantity, price, date]);
    }

    const sql = `INSERT INTO sales (mr_id, store_id, medicine_name, quantity, price, date) VALUES ?`;
    await db.query(sql, [values]);

    res
      .status(201)
      .json({ success: true, message: "All sales records added successfully" });
  } catch (error) {
    console.error("Error adding bulk sales:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ✅ Get Today's Sales for MR
const getTodaysSalesForMR = async (req, res) => {
  const { mr_id } = req.params;

  try {
    const [sales] = await db.query(
      `SELECT s.*, m.name AS storeName 
       FROM sales s 
       JOIN medical_stores m ON s.store_id = m.id 
       WHERE DATE(s.date) = CURDATE() AND s.mr_id = ?`,
      [mr_id]
    );

    res.status(200).json({ success: true, sales });
  } catch (error) {
    console.error("❌ Error fetching today's sales:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ✅ Get All Sales with Filters
const getAllSales = async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.query;
    let sql = `
      SELECT s.id, s.medicine_name, s.quantity, s.price, s.date,
             mrs.name AS mr_name, stores.name AS store_name
      FROM sales s
      JOIN mrs ON s.mr_id = mrs.id
      JOIN medical_stores stores ON s.store_id = stores.id
    `;

    let params = [];
    let conditions = [];

    if (filter) {
      switch (filter) {
        case "last7days":
          conditions.push(`s.date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`);
          break;
        case "last15days":
          conditions.push(`s.date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)`);
          break;
        case "last30days":
          conditions.push(`s.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`);
          break;
        case "previousMonth":
          conditions.push(
            `MONTH(s.date) = MONTH(CURDATE()) - 1 AND YEAR(s.date) = YEAR(CURDATE())`
          );
          break;
      }
    }

    if (startDate && endDate) {
      conditions.push(`s.date BETWEEN ? AND ?`);
      params.push(startDate, endDate);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(" AND ");
    }

    sql += ` ORDER BY s.date DESC`;

    const [sales] = await db.query(sql, params);
    res.status(200).json({ success: true, sales });
  } catch (error) {
    console.error("❌ Error fetching sales with filters:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ✅ Export All
module.exports = {
  addSales,
  addBulkSales,
  getTodaysSalesForMR,
  getAllSales,
};
