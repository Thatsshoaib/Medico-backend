const express = require("express");
const router = express.Router();

/**
 * ➤ CREATE SINGLE STORE
 */
router.post("/", async (req, res) => {
  try {
    const prisma = req.prisma;
    const { name, address, contact } = req.body;

    if (!name || name.trim().length < 2 || !address) {
      return res.status(400).json({
        error: "Valid name and address required"
      });
    }

    const store = await prisma.store.create({
      data: {
        name: name.trim(),
        address: address.trim(),
        contact: contact ? contact.trim() : null
      }
    });

    res.status(201).json({
      success: true,
      message: "Store added successfully",
      store
    });

  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Store already exists" });
    }

    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * ➤ BULK CREATE STORES (NEW)
 * Accepts an array of stores and creates them in batch
 */
router.post("/bulk", async (req, res) => {
  try {
    const prisma = req.prisma;
    const { stores } = req.body;

    // Validate input
    if (!stores || !Array.isArray(stores) || stores.length === 0) {
      return res.status(400).json({
        error: "Invalid request. Expected array of stores with name and address"
      });
    }

    const results = {
      successful: [],
      failed: [],
      total: stores.length
    };

    // Process each store one by one (to handle validation errors gracefully)
    for (let i = 0; i < stores.length; i++) {
      const store = stores[i];
      const { name, address, contact } = store;

      // Validate required fields
      if (!name || name.trim().length < 2 || !address) {
        results.failed.push({
          index: i,
          data: store,
          error: "Valid name and address required"
        });
        continue;
      }

      try {
        const createdStore = await prisma.store.create({
          data: {
            name: name.trim(),
            address: address.trim(),
            contact: contact ? contact.trim() : null
          }
        });

        results.successful.push({
          index: i,
          original: store,
          created: createdStore
        });
      } catch (error) {
        // Handle duplicate entries
        if (error.code === "P2002") {
          results.failed.push({
            index: i,
            data: store,
            error: "Store already exists"
          });
        } else {
          results.failed.push({
            index: i,
            data: store,
            error: error.message
          });
        }
      }
    }

    res.status(201).json({
      success: true,
      message: `Successfully created ${results.successful.length} out of ${stores.length} stores`,
      results: {
        successfulCount: results.successful.length,
        failedCount: results.failed.length,
        successful: results.successful,
        failed: results.failed
      }
    });

  } catch (error) {
    console.error("Bulk create error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * ➤ BULK CREATE STORES WITH TRANSACTION (Alternate approach)
 * Uses Prisma transaction - either all succeed or all fail
 */
router.post("/bulk-transaction", async (req, res) => {
  try {
    const prisma = req.prisma;
    const { stores } = req.body;

    if (!stores || !Array.isArray(stores) || stores.length === 0) {
      return res.status(400).json({
        error: "Invalid request. Expected array of stores"
      });
    }

    // Validate all stores first
    for (const store of stores) {
      if (!store.name || store.name.trim().length < 2 || !store.address) {
        return res.status(400).json({
          error: "Each store must have valid name and address"
        });
      }
    }

    // Prepare data for bulk creation
    const storesData = stores.map(store => ({
      name: store.name.trim(),
      address: store.address.trim(),
      contact: store.contact ? store.contact.trim() : null
    }));

    // Create all stores in a transaction
    const createdStores = await prisma.$transaction(
      storesData.map(storeData => 
        prisma.store.create({ data: storeData })
      )
    );

    res.status(201).json({
      success: true,
      message: `Successfully created ${createdStores.length} stores`,
      stores: createdStores
    });

  } catch (error) {
    console.error("Bulk transaction error:", error);
    
    if (error.code === "P2002") {
      return res.status(400).json({ 
        error: "One or more stores already exist. Transaction rolled back." 
      });
    }
    
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Rest of your existing endpoints remain the same...
// GET, PUT, DELETE, etc.

/**
 * ➤ GET ALL STORES
 */
router.get("/", async (req, res) => {
  try {
    const prisma = req.prisma;

    const stores = await prisma.store.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        address: true,
        contact: true,
        createdAt: true
      }
    });

    res.json(stores);

  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * ➤ GET STORE BY ID
 */
router.get("/:id", async (req, res) => {
  try {
    const prisma = req.prisma;
    const id = Number(req.params.id);

    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        mrStores: {
          include: {
            mr: true
          }
        },
        sales: true
      }
    });

    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    const formatted = {
      ...store,
      contact: store.contact || null,
      mrs: store.mrStores.map(s => s.mr)
    };

    res.json(formatted);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * ➤ GET STORES ASSIGNED TO MR
 */
router.get("/assign-stores/:mrId", async (req, res) => {
  try {
    const prisma = req.prisma;
    const mrId = Number(req.params.mrId);

    const mrStores = await prisma.mRStore.findMany({
      where: { mrId },
      include: {
        store: true
      }
    });

    const stores = mrStores.map(ms => ({
      ...ms.store,
      contact: ms.store.contact || null
    }));

    res.json(stores);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * ➤ UPDATE STORE
 */
router.put("/:id", async (req, res) => {
  try {
    const prisma = req.prisma;
    const id = Number(req.params.id);
    const { name, address, contact } = req.body;

    const updated = await prisma.store.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        address: address ? address.trim() : undefined,
        contact: contact !== undefined
          ? (contact ? contact.trim() : null)
          : undefined
      }
    });

    res.json({
      success: true,
      message: "Store updated",
      store: updated
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * ➤ DELETE STORE
 */
router.delete("/:id", async (req, res) => {
  try {
    const prisma = req.prisma;
    const id = Number(req.params.id);

    await prisma.$transaction([
      prisma.mRStore.deleteMany({ where: { storeId: id } }),
      prisma.sale.deleteMany({ where: { storeId: id } }),
      prisma.store.delete({ where: { id } })
    ]);

    res.json({
      success: true,
      message: "Store deleted successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;