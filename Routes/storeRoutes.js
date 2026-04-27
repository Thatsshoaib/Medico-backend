const express = require("express");
const router = express.Router();

/**
 * ➤ CREATE STORE
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