const express = require("express");
const router = express.Router();

router.post("/add", async (req, res) => {
  try {
    const { dealer_name, medicines } = req.body;
    const prisma = req.prisma;

    if (!dealer_name || !Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({
        message: "Dealer name and medicines are required",
      });
    }

    const results = [];

    await prisma.$transaction(async (tx) => {
      for (const med of medicines) {
        const { medicine_name, quantity, price } = med;

        if (!medicine_name || !quantity || !price) {
          throw new Error("Invalid medicine data");
        }

        // ✅ Check if stock exists by productName
        const existingStock = await tx.stock.findFirst({
          where: { productName: medicine_name }
        });

        let stock;
        if (existingStock) {
          // Update existing stock
          stock = await tx.stock.update({
            where: { id: existingStock.id },
            data: {
              quantity: {
                increment: Number(quantity),
              },
              price: Number(price),
            },
          });
        } else {
          // Create new stock
          stock = await tx.stock.create({
            data: {
              productName: medicine_name,
              quantity: Number(quantity),
              price: Number(price),
            },
          });
        }

        results.push(stock);
      }
    });

    res.status(201).json({
      message: "Stock updated successfully",
      data: results,
    });

  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
});

router.get("/get-med", async (req, res) => {
  try {
    const prisma = req.prisma;
    
    const meds = await prisma.stock.findMany({
      select: {
        id: true,
        productName: true,
        price: true,
        quantity: true,
      },
      distinct: ['productName'], // Agar same naam ki multiple entries hain to unique lene ke liye
      orderBy: {
        productName: 'asc'
      }
    });

    // Group by productName and keep latest price (optional)
    const medicineMap = new Map();
    
    meds.forEach(med => {
      // Agar same product multiple times hai, to latest price use karo
      // Ya average price nikal sakte ho
      if (!medicineMap.has(med.productName)) {
        medicineMap.set(med.productName, {
          id: med.id,
          productName: med.productName,
          price: med.price,
          quantity: med.quantity
        });
      }
    });

    const medicines = Array.from(medicineMap.values());

    res.json({
      success: true,
      medicines: medicines,
      // Alternative: Agar simple array of objects chahiye
      // medicines: meds.map(m => ({
      //   id: m.id,
      //   name: m.productName,
      //   price: m.price,
      //   quantity: m.quantity
      // }))
    });

  } catch (error) {
    console.error('Error fetching medicines:', error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching medicines" 
    });
  }
});

router.get("/all-stock", async (req, res) => {
  try {
    const prisma = req.prisma;
    
    const stock = await prisma.stock.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      stock,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

module.exports = router;