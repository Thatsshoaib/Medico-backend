// routes/address.js
const express = require('express');
const router = express.Router();
const db = require('../Config/db');

// POST /api/address
router.post('/add-address', (req, res) => {
  const { address_line1 } = req.body;

  if (!address_line1) {
    return res.status(400).json({ error: 'Address Line 1 is required' });
  }

  const query = 'INSERT INTO address (address_line1) VALUES (?)';
  db.query(query, [address_line1 || null], (err, result) => {
    if (err) {
      console.error('Error inserting address:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(201).json({
      message: 'Address added successfully',
      addressId: result.insertId,
    });
  });
});


router.get('/all-address', async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM address');
    res.json(results);
  } catch (err) {
    console.error('Error fetching addresses:', err);
    res.status(500).json({ error: 'Database error' });
  }
});


module.exports = router;
