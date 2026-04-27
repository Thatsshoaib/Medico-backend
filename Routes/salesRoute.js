const express = require("express");
const router = express.Router();

router.post("/add", async (req, res) => {
  try {
    console.log("🔥 BODY AA RHA HAI:", JSON.stringify(req.body, null, 2));

    const { mrId, storeId, medicines } = req.body;

    // ✅ Basic validation
    if (!mrId || !storeId || !Array.isArray(medicines)) {
      return res.status(400).json({ error: "All fields required" });
    }

    // ✅ Check MR exists (IMPORTANT FIX)
    const mrExists = await req.prisma.mR.findUnique({
  where: { id: Number(mrId) }
});

    if (!mrExists) {
      return res.status(400).json({ error: `MR with ID ${mrId} not found` });
    }

    // ✅ Check Store exists
    const storeExists = await req.prisma.store.findUnique({
      where: { id: Number(storeId) }
    });

    if (!storeExists) {
      return res.status(400).json({ error: `Store with ID ${storeId} not found` });
    }

    const validMedicines = medicines.filter(
      (m) => m.productName && m.quantity && m.price
    );

    if (validMedicines.length === 0) {
      return res.status(400).json({ error: "Valid medicines required" });
    }

    const createdSales = [];
    const errors = [];

    for (let i = 0; i < validMedicines.length; i++) {
      const item = validMedicines[i];
      const { productName, quantity, price } = item;

      try {
        console.log(`📦 Processing ${i + 1}/${validMedicines.length}: ${productName}`);

        const stock = await req.prisma.stock.findFirst({
          where: { productName }
        });

        if (!stock) {
          throw new Error(`${productName} not found in stock`);
        }

        if (stock.quantity < quantity) {
          throw new Error(`${productName} insufficient stock. Available: ${stock.quantity}`);
        }

        // ✅ FINAL SALE CREATE (NO PHOTO)
        const sale = await req.prisma.sale.create({
          data: {
            mr: { connect: { id: Number(mrId) } },
            store: { connect: { id: Number(storeId) } },
            productName,
            quantity: Number(quantity),
            price: Number(price),
            saleDate: new Date(),
          }
        });

        await req.prisma.stock.update({
          where: { id: stock.id },
          data: { quantity: stock.quantity - quantity }
        });

        createdSales.push(sale);
        console.log(`✅ Sale created for ${productName}`);
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
        errors
      });
    }

    const totalAmount = createdSales.reduce(
      (sum, sale) => sum + (sale.price * sale.quantity),
      0
    );

    res.status(201).json({
      success: true,
      message: `${createdSales.length} out of ${validMedicines.length} sale(s) created successfully`,
      sales: createdSales,
      totalAmount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error("❌ ERROR:", error.message);
    res.status(400).json({ error: error.message });
  }
});



// Add new visit
router.post("/visit", async (req, res) => {
  try {
    const { mrId, storeId, photoUrl } = req.body;

    if (!mrId || !storeId) {
      return res.status(400).json({ error: "MR ID and Store ID required" });
    }

    if (!photoUrl) {
      return res.status(400).json({ error: "Photo is required for visit" });
    }

    const visit = await req.prisma.visit.create({
      data: {
        mr: { connect: { id: Number(mrId) } },
        store: { connect: { id: Number(storeId) } },
        photoUrl: photoUrl,
        visitDate: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      message: "Visit recorded with photo 📸",
      visit,
    });

  } catch (error) {
    console.error("Visit error:", error);
    res.status(400).json({ error: error.message });
  }
});

// ✅ Get visits by MR
router.get("/mr/:mrId", async (req, res) => {
  try {
    const mrId = Number(req.params.mrId);

    if (!mrId) {
      return res.status(400).json({ error: "Invalid MR ID" });
    }

    const visits = await req.prisma.visit.findMany({
      where: { mrId },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
      orderBy: { visitDate: "desc" },
    });

    res.json({ success: true, visits });
  } catch (error) {
    console.error("Error fetching visits:", error);
    res.status(500).json({ error: error.message });
  }
});


// ✅ Get visits by Store
router.get("/store/:storeId", async (req, res) => {
  try {
    const storeId = Number(req.params.storeId);

    if (!storeId) {
      return res.status(400).json({ error: "Invalid Store ID" });
    }

    const visits = await req.prisma.visit.findMany({
      where: { storeId },
      include: {
        mr: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { visitDate: "desc" },
    });

    res.json({ success: true, visits });
  } catch (error) {
    console.error("Error fetching visits:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get ALL visits (Admin)
router.get("/allvisits", async (req, res) => {
  try {
    const { search = "" } = req.query;

    const visits = await req.prisma.visit.findMany({
      where: {
        OR: [
          {
            store: {
              name: {
                contains: search,
              },
            },
          },
          {
            mr: {
              name: {
                contains: search,
              },
            },
          },
        ],
      },
      include: {
        store: {
          select: { id: true, name: true, address: true },
        },
        mr: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { visitDate: "desc" },
    });

    res.json({ success: true, visits });
  } catch (error) {
    console.error("Admin visits error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
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
        mr: { id: mrId },  // ✅ Use relation
        saleDate: { gte: start, lte: end }
      },
      include: {
        store: true,
        mr: true
      },
      orderBy: { saleDate: "desc" }
    });

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
      mr_name: sale.mr?.name,
      photoUrl: sale.photoUrl
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
      store_name: sale.store?.name,
      store_contact : sale.store?.contact,
      photoUrl: sale.photoUrl
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