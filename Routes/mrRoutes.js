const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

// 🔥 ADD MR - Fixed Transaction Timeout
router.post("/add", async (req, res) => {
  try {
    const prisma = req.prisma;
    const { name, email, phone, password, assignedStores, salary } = req.body;

    // ✅ Validation
    if (!name || !email || !phone || !password || !salary || isNaN(Number(salary))) {
      return res.status(400).json({ error: "All fields required" });
    }

    // ✅ Check existing user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // ✅ Normalize stores
    const storeNames = assignedStores || [];

    // ✅ 🔥 CHECK STORE ALREADY ASSIGNED (FAST QUERY)
    if (storeNames.length > 0) {
      const conflicts = await prisma.mRStore.findMany({
        where: {
          store: {
            name: { in: storeNames }
          }
        },
        select: {
          store: {
            select: { name: true }
          }
        }
      });

      if (conflicts.length > 0) {
        const names = conflicts.map(c => c.store.name);

        return res.status(400).json({
          error: `Already assigned store(s): ${names.join(", ")}`
        });
      }
    }

    // ✅ Fetch stores (only id needed)
    const stores = await prisma.store.findMany({
      where: { name: { in: storeNames } },
      select: { id: true }
    });

    // ✅ Hash password (outside tx)
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ 🔥 SHORT TRANSACTION (NO EXTRA LOGIC INSIDE)
    const result = await prisma.$transaction(async (tx) => {

      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "mr",
        },
      });

      const mr = await tx.mR.create({
        data: {
          name,
          email,
          phone,
          salary: Number(salary),
          userId: user.id,
        },
      });

      if (stores.length > 0) {
        await tx.mRStore.createMany({
          data: stores.map((store) => ({
            mrId: mr.id,
            storeId: store.id,
          })),
        });
      }

      await tx.mRSalary.create({
        data: {
          mrId: mr.id,
          baseSalary: Number(salary),
          effectiveFrom: new Date(),
        },
      });

      return { mr };

    }, {
      timeout: 20000,
      maxWait: 20000
    });

    res.status(201).json({
      success: true,
      message: "MR created successfully",
      data: result.mr,
    });

  } catch (error) {
    console.error("Error adding MR:", error);

    // 🔥 Handle unique constraint (extra safety)
    if (error.code === "P2002") {
      return res.status(400).json({
        error: "One or more stores are already assigned"
      });
    }

    if (error.code === "P2028") {
      return res.status(500).json({
        error: "Transaction failed, please try again"
      });
    }

    res.status(500).json({ error: error.message });
  }
});

// 🔥 GET ALL MRs
router.get("/", async (req, res) => {
  try {
    const prisma = req.prisma;

    const mrs = await prisma.mR.findMany({
      include: {
        mrStores: {
          include: {
            store: true,
          },
        },
      },
    });

    const formatted = mrs.map((mr) => ({
      id: mr.id,
      name: mr.name,
      salary: mr.salary,
      email: mr.email,
      phone: mr.phone,
      assigned_stores: mr.mrStores.map((s) => s.store.name),
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching MRs:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🔥 GET SINGLE MR
router.get("/:id", async (req, res) => {
  try {
    const prisma = req.prisma;
    const id = Number(req.params.id);

    const mr = await prisma.mR.findUnique({
      where: { id },
      include: {
        mrStores: {
          include: {
            store: true,
          },
        },
      },
    });

    if (!mr) {
      return res.status(404).json({ error: "MR not found" });
    }

    res.json({
      id: mr.id,
      name: mr.name,
      salary: mr.salary,
      email: mr.email,
      phone: mr.phone,
      assignedStores: mr.mrStores.map((s) => s.store.name),
    });
  } catch (error) {
    console.error("Error fetching MR:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🔥 UPDATE MR - Fixed Transaction Timeout
router.put("/edit/:id", async (req, res) => {
  try {
    const prisma = req.prisma;
    const { name, email, phone, assignedStores, salary } = req.body;
    const id = Number(req.params.id);

    if (!name || !email || !phone || !salary || isNaN(Number(salary))) {
      return res.status(400).json({ error: "Invalid input" });
    }

    // ✅ Email duplicate check
    const existingEmail = await prisma.mR.findFirst({
      where: {
        email,
        NOT: { id },
      },
    });

    if (existingEmail) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // ✅ 🔥 CHECK STORE CONFLICT (exclude current MR)
if (assignedStores && assignedStores.length > 0) {
  const conflicts = await prisma.mRStore.findMany({
    where: {
      store: {
        name: { in: assignedStores }
      },
      NOT: {
        mrId: id
      }
    },
    include: { store: true }
  });

  if (conflicts.length > 0) {
    const names = conflicts.map(c => c.store.name);

    return res.status(400).json({
      error: `Already assigned store(s): ${names.join(", ")}`
    });
  }
}

    await prisma.$transaction(async (tx) => {

      const existingMR = await tx.mR.findUnique({
        where: { id },
        select: { salary: true },
      });

      await tx.mR.update({
        where: { id },
        data: {
          name,
          email,
          phone,
          salary: Number(salary),
        },
      });

      // ✅ Salary change tracking
      if (existingMR.salary !== Number(salary)) {
        await tx.mRSalary.create({
          data: {
            mrId: id,
            baseSalary: Number(salary),
            effectiveFrom: new Date(),
          },
        });
      }

      // ✅ Update stores
      await tx.mRStore.deleteMany({
        where: { mrId: id },
      });

      if (assignedStores && assignedStores.length > 0) {
        const stores = await tx.store.findMany({
          where: { name: { in: assignedStores } },
        });

        if (stores.length > 0) {
          await tx.mRStore.createMany({
            data: stores.map((s) => ({
              mrId: id,
              storeId: s.id,
            })),
          });
        }
      }

    }, {
      timeout: 30000,
      maxWait: 30000
    });

    res.json({
      success: true,
      message: "MR updated successfully"
    });

  } catch (error) {
    console.error("Error updating MR:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🔥 DELETE MR - Fixed Transaction Timeout
router.delete("/delete/:id", async (req, res) => {
  try {
    const prisma = req.prisma;
    const id = Number(req.params.id);

    // ✅ Check if MR exists
    const mrExists = await prisma.mR.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!mrExists) {
      return res.status(404).json({ error: "MR not found" });
    }

    // ✅ DELETE with timeout
    await prisma.$transaction(async (tx) => {
      // 1️⃣ Delete MRStore relations
      await tx.mRStore.deleteMany({
        where: { mrId: id }
      });

      // 2️⃣ Delete MR
      await tx.mR.delete({
        where: { id }
      });

      // 3️⃣ Delete associated User
      if (mrExists.userId) {
        await tx.user.delete({
          where: { id: mrExists.userId }
        });
      }
    }, {
      timeout: 30000, // ✅ 30 seconds timeout
      maxWait: 30000
    });

    res.json({ 
      success: true,
      message: "MR deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting MR:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;