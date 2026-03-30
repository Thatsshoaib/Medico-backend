const express = require("express");
const router = express.Router();

router.post("/add", async (req, res) => {
  try {
    const { dealer_name, medicines } = req.body;

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

        // ✅ UPSERT (insert or update)
        const stock = await tx.stock.upsert({
          where: { medicineName: medicine_name },
          update: {
            totalQuantity: {
              increment: Number(quantity),
            },
            price: Number(price), // latest price update
            dealerName: dealer_name
          },
          create: {
            medicineName: medicine_name,
            totalQuantity: Number(quantity),
            price: Number(price),
            dealerName: dealer_name
          },
        });

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
    const meds = await prisma.stock.findMany({
      select: {
        medicineName: true,
      },
    });

    res.json({
      medicines: meds.map((m) => m.medicineName),
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching medicines" });
  }
});

router.get("/all-stock", async (req, res) => {
  try {
    const stock = await prisma.stock.findMany({
      orderBy: {
        dateAdded: "desc",
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