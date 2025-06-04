// const express = require("express");
// const {
//   addSales,
//   addBulkSales,
//   getTodaysSalesForMR,
//   getAllSales
// } = require("../Controller/salesController"); // Update the path

// const router = express.Router();

// router.post("/", addSales);
// router.post("/bulk", addBulkSales);
// router.get("/today/:mr_id", getTodaysSalesForMR);
// router.get("/all", getAllSales);

// module.exports = router;

// routes/sales.js

const express = require("express");
const router = express.Router();
const db = require("../Config/db"); 

router.post("/add", async (req, res) => {
  const { mr_id, store_id, total_sales, date, photo } = req.body;

  if (!photo) {
    return res.status(400).json({ error: "Photo is required" });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO sales (mr_id, store_id, total_sales, date, photo) VALUES (?, ?, ?, ?, ?)`,
      [mr_id, store_id, total_sales, date, photo]
    );
    res.status(201).json({ saleID: result.insertId });
  } catch (error) {
    console.error("Error inserting sale:", error);
    res.status(500).json({ error: "Failed to create sale summary" });
  }
});

// Add medicine sales details
router.post("/salesdetail", async (req, res) => {
  console.log("POST /salesdetail route hit");
  const { saleID, medicine_name, quantity, price, total_price, date } =
    req.body;
  console.log("Request body:", req.body);

  if (
    !saleID ||
    !medicine_name ||
    !quantity ||
    !price ||
    !total_price ||
    !date
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Insert sale detail
    console.log("Inserting sale detail...");
    await db.query(
      `INSERT INTO salesdetail (saleID, medicine_name, quantity, price, total_price, date) VALUES (?, ?, ?, ?, ?, ?)`,
      [saleID, medicine_name, quantity, price, total_price, date]
    );
    console.log("Sale detail inserted.");

    // Fetch current total_quantity from stock for this medicine
    const [stockRows] = await db.query(
      `SELECT total_quantity FROM stock WHERE medicine_name = ?`,
      [medicine_name]
    );
    console.log("Stock rows:", stockRows);

    if (stockRows.length === 0) {
      console.log("Medicine not found in stock");
      return res.status(404).json({ error: "Medicine not found in stock" });
    }

    const currentLeftQuantity = stockRows[0].total_quantity;
    console.log("Current left quantity:", currentLeftQuantity);

    const newLeftQuantity = currentLeftQuantity - quantity;
    console.log("New left quantity:", newLeftQuantity);

    if (newLeftQuantity < 0) {
      console.log("Insufficient stock");
      return res.status(400).json({ error: "Insufficient stock quantity" });
    }

    // Update stock total_quantity
    await db.query(
      `UPDATE stock SET total_quantity = ? WHERE medicine_name = ?`,
      [newLeftQuantity, medicine_name]
    );
    console.log("Stock updated successfully.");

    res
      .status(201)
      .json({ message: "Sale detail added and stock updated successfully" });
  } catch (error) {
    console.error("Error inserting sale detail or updating stock:", error);
    res
      .status(500)
      .json({ error: "Failed to add sale detail or update stock" });
  }
});

//route tp get sales per MR
router.get("/currentday-sales/mr/:mrId", async (req, res) => {
  const mrId = req.params.mrId;

  if (!mrId) {
    return res.status(400).json({ error: "MR ID is required" });
  }

  try {
    const sql = `
      SELECT 
  s.saleID AS sale_id,
  s.total_sales,
  s.date AS sale_date,
  s.photo,
  sd.salesdetailID AS detail_id,
  sd.medicine_name,
  sd.quantity,
  sd.price,
  sd.total_price,
  sd.date AS detail_date,
  ms.id AS store_id,
  ms.name AS store_name
FROM sales s
JOIN salesdetail sd ON s.saleID = sd.saleID
JOIN medical_stores ms ON s.store_id = ms.id
WHERE s.mr_id = ?
  AND s.date >= CURDATE()
  AND s.date < CURDATE() + INTERVAL 1 DAY
ORDER BY s.date DESC;

    `;

    const [sales] = await db.query(sql, [mrId]);
    res.json(sales);
  } catch (error) {
    console.error("Error fetching sales for MR:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/all", async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.query;
    let sql = `
     SELECT s.saleID, sd.medicine_name, sd.quantity, sd.price, s.date,
       mrs.name AS mr_name, stores.name AS store_name
FROM sales s
JOIN salesdetail sd ON s.saleID = sd.saleID
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
});

module.exports = router;
