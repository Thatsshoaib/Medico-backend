const express = require("express");
const router = express.Router();
const db = require("../Config/db");

// Add Store (Fixed Table Name & API Path)
router.post("/", async (req, res) => {
  const { name, address } = req.body;
  if (!name || !address) {
    return res.status(400).json({ error: "Name and address are required" });
  }

  try {
    await db.query("INSERT INTO medical_stores (name, address) VALUES (?, ?)", [name, address]);
    res.status(201).json({ message: "Store added successfully" });
  } catch (error) {
    console.error("Error adding store:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get all stores
router.get("/", async (req, res) => {
  try {
    const [stores] = await db.query("SELECT * FROM medical_stores");
    res.json(stores);
  } catch (error) {
    console.error("Error fetching stores:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

  // Assuming Express and db are already set up
  router.get('/assign-stores/:mrId', async (req, res) => {
    const mrId = req.params.mrId;

    if (!mrId) {
      return res.status(400).json({ error: "MR ID is required" });
    }

    try {
      const sql = `
        SELECT ms.*
        FROM mr_stores AS mrs
        JOIN medical_stores AS ms ON mrs.store_id = ms.id
        WHERE mrs.mr_id = ?
      `;

      const [stores] = await db.query(sql, [mrId]);
      res.json(stores);
    } catch (error) {
      console.error("Error fetching stores for MR:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });


// Edit Store (Fixed Table Name & API Path)
router.put("/:id", async (req, res) => {
  const { name, address } = req.body;
  const { id } = req.params;

  try {
    await db.query("UPDATE medical_stores SET name = ?, address = ? WHERE id = ?", [name, address, id]);
    res.json({ message: "Store updated successfully" });
  } catch (error) {
    console.error("Error updating store:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete Store (Fixed Table Name & API Path)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await db.query("DELETE FROM medical_stores WHERE id = ?", [id]);
    res.json({ message: "Store deleted successfully" });
  } catch (error) {
    console.error("Error deleting store:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
