// routes/address.js
const express = require('express');
const router = express.Router();
const prisma = require('../Config/prisma'); // 👈 prisma client

// POST /api/address/add-address
router.post('/add-address', async (req, res) => {
  try {
    const { address_line1 } = req.body;

    // ✅ Validation
    if (!address_line1 || address_line1.trim().length < 5) {
      return res.status(400).json({ 
        error: 'Valid Address Line 1 is required (min 5 chars)' 
      });
    }

    // ✅ Create using Prisma
    const newAddress = await prisma.address.create({
      data: {
        address_line1: address_line1.trim()
      }
    });

    res.status(201).json({
      message: 'Address added successfully',
      data: newAddress
    });

  } catch (error) {
    console.error('Error inserting address:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// GET /api/address/all-address
router.get('/all-address', async (req, res) => {
  try {
    const addresses = await prisma.address.findMany({
      orderBy: { id: 'desc' }
    });

    res.json(addresses);

  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;