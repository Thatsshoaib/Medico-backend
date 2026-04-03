const express = require("express");
const router = express.Router();

router.post("/add", async (req, res) => {
  try {
    console.log("🔥 BODY AA RHA HAI:", JSON.stringify(req.body, null, 2));

    const { mrId, storeId, medicines } = req.body;

    if (mrId === undefined || storeId === undefined || !Array.isArray(medicines)) {
      return res.status(400).json({ error: "All fields required" });
    }

    const validMedicines = medicines.filter(
      (m) => m.productName && m.quantity && m.price
    );

    if (validMedicines.length === 0) {
      return res.status(400).json({ error: "Valid medicines required" });
    }

    // ✅ Process each medicine individually
    const createdSales = [];
    const errors = [];
    
    for (let i = 0; i < validMedicines.length; i++) {
      const item = validMedicines[i];
      const { productName, quantity, price } = item;
      
      try {
        console.log(`📦 Processing ${i + 1}/${validMedicines.length}: ${productName}`);

        // ✅ Check stock - Simple case-sensitive search for MySQL/TiDB
        const stock = await req.prisma.stock.findFirst({
          where: { 
            productName: productName  // Exact match
          }
        });

        if (!stock) {
          throw new Error(`${productName} not found in stock`);
        }

        if (stock.quantity < quantity) {
          throw new Error(`${productName} insufficient stock. Available: ${stock.quantity}`);
        }

        // ✅ CREATE SALE
        const sale = await req.prisma.sale.create({
          data: {
            mrId: Number(mrId),
            storeId: Number(storeId),
            productName: productName,
            quantity: Number(quantity),
            price: Number(price),
            saleDate: new Date()
          }
        });

        // ✅ Update stock
        await req.prisma.stock.update({
          where: { id: stock.id },
          data: { quantity: stock.quantity - quantity }
        });

        createdSales.push(sale);
        console.log(`✅ Sale created for ${productName}, ID: ${sale.id}`);

      } catch (itemError) {
        console.error(`❌ Failed for ${productName}:`, itemError.message);
        errors.push({
          productName,
          error: itemError.message
        });
      }
    }

    if (createdSales.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No sales could be processed",
        errors: errors
      });
    }

    const totalAmount = createdSales.reduce((sum, sale) => sum + (sale.price * sale.quantity), 0);

    res.status(201).json({
      success: true,
      message: `${createdSales.length} out of ${validMedicines.length} sale(s) created successfully`,
      sales: createdSales,
      totalAmount: totalAmount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error("❌ ERROR:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// 📅 CURRENT DAY SALES
router.get("/currentday-sales/mr/:mrId", async (req, res) => {
  try {
    const mrId = Number(req.params.mrId);

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const sales = await req.prisma.sale.findMany({
      where: {
        mrId: mrId,
        saleDate: { gte: start, lte: end }
      },
      include: {
        store: true,
        mr: true
      },
      orderBy: { saleDate: "desc" }
    });

    // Format as per frontend expectation
    const formatted = sales.map(sale => ({
      sale_id: sale.id,
      total_sales: sale.price * sale.quantity,
      sale_date: sale.saleDate,
      medicine_name: sale.productName,
      quantity: sale.quantity,
      price: sale.price,
      total_price: sale.price * sale.quantity,
      store_id: sale.store?.id,
      store_name: sale.store?.name,
      mr_name: sale.mr?.name
    }));

    res.json(formatted);

  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 📊 ALL SALES
router.get("/all", async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.query;

    let where = {};
    const now = new Date();

    if (filter === "last7days") {
      where.saleDate = { gte: new Date(now.setDate(now.getDate() - 7)) };
    } else if (filter === "last15days") {
      where.saleDate = { gte: new Date(now.setDate(now.getDate() - 15)) };
    } else if (filter === "last30days") {
      where.saleDate = { gte: new Date(now.setDate(now.getDate() - 30)) };
    }

    if (startDate && endDate) {
      where.saleDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const sales = await req.prisma.sale.findMany({
      where,
      include: {
        mr: true,
        store: true
      },
      orderBy: { saleDate: "desc" }
    });

    const formatted = sales.map(sale => ({
      saleID: sale.id,
      medicine_name: sale.productName,
      quantity: sale.quantity,
      price: sale.price,
      total_amount: sale.price * sale.quantity,
      date: sale.saleDate,
      mr_name: sale.mr?.name,
      store_name: sale.store?.name
    }));

    res.status(200).json({ 
      success: true, 
      sales: formatted,
      total: formatted.length 
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;