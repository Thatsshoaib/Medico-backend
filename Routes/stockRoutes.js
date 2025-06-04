const express = require('express');
const router = express.Router();
const db = require('../Config/db'); // adjust path if needed

// @access  Admin (authentication middleware can be added later)
router.post("/add", async (req, res) => {
  const { dealer_name, medicines } = req.body;

  if (!dealer_name || !Array.isArray(medicines) || medicines.length === 0) {
    return res.status(400).json({ message: "Dealer name and at least one medicine are required" });
  }

  const query = `
    INSERT INTO stock (medicine_name, total_quantity, price, dealer_name, date_added)
    VALUES (?, ?, ?, ?, CURRENT_DATE())
  `;

  try {
    const insertResults = [];

    for (const med of medicines) {
      const { medicine_name, quantity, price } = med;

      if (!medicine_name || !quantity || !price) {
        return res.status(400).json({ message: "Each medicine must have name, quantity, and price" });
      }

      const [result] = await db.execute(query, [
        medicine_name,
        quantity,
        price,
        dealer_name,
      ]);

      insertResults.push({ medicine_name, stockId: result.insertId });
    }

    res.status(201).json({
      message: "Medicines added successfully",
      added: insertResults,
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Database error" });
  }
});



router.get('/get-med', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT medicine_name FROM stock');
    const medicineNames = rows.map(row => row.medicine_name);
    res.json({ medicines: medicineNames });
  } catch (error) {
    console.error('Error fetching medicine names:', error);
    res.status(500).json({ message: 'Database error' });
  }
});


router.get("/all-stock", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM stock ORDER BY date_added DESC");
    res.status(200).json({ success: true, stock: rows });
  } catch (error) {
    console.error("❌ Error fetching stock data:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
module.exports = router;
