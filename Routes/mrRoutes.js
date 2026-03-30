const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
// ✅ USE req.prisma (best practice)

// 🔥 ADD MR

router.post("/add", async (req, res) => {
  try {
    const prisma = req.prisma;

    const { name, email, phone, password, assignedStores, salary } = req.body;

    // ✅ Validation
    if (
      !name ||
      !email ||
      !phone ||
      !password ||
      !Array.isArray(assignedStores) ||
      assignedStores.length === 0 ||
      !salary ||
      isNaN(Number(salary))
    ) {
      return res.status(400).json({
        error: "All fields required",
      });
    }

    // ✅ Check existing user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // ✅ Fetch stores
    const stores = await prisma.store.findMany({
      where: { name: { in: assignedStores } },
    });

    if (stores.length !== assignedStores.length) {
      return res.status(400).json({
        error: "Some stores not found",
      });
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ TRANSACTION
    const result = await prisma.$transaction(async (tx) => {
      // 1️⃣ Create USER
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "mr",
        },
      });

      // 2️⃣ Create MR (linked to user)
      const mr = await tx.mR.create({
        data: {
          name,
          email,
          phone,
          salary: Number(salary),
          userId: user.id, // ✅ LINK
        },
      });

      // 3️⃣ Assign stores
      await tx.mRStore.createMany({
        data: stores.map((store) => ({
          mrId: mr.id,
          storeId: store.id,
        })),
      });

      return { user, mr };
    });

    res.status(201).json({
      message: "MR + User created successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error adding MR:", error);
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
          // ✅ FIXED
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
      email: mr.email, // ✅ add this
      phone: mr.phone, // ✅ YE ADD KARNA HAI

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
          // ✅ FIXED
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
      email: mr.email, // ✅ add this
      phone: mr.phone, // ✅ YE ADD KARNA HAI
      assignedStores: mr.mrStores.map((s) => s.store.name),
    });
  } catch (error) {
    console.error("Error fetching MR:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🔥 UPDATE MR
router.put("/edit/:id", async (req, res) => {
  try {
    const prisma = req.prisma;

    const { name, email, phone, assignedStores, salary } = req.body;
    const id = Number(req.params.id);

    if (
      !name ||
      !email ||
      !phone ||
      !Array.isArray(assignedStores) ||
      assignedStores.length === 0 ||
      !salary ||
      isNaN(Number(salary))
    ) {
      return res.status(400).json({ error: "Invalid input" });
    }

    // ✅ Email duplicate check (ignore same id)
    const existingEmail = await prisma.mR.findFirst({
      where: {
        email,
        NOT: { id },
      },
    });

    if (existingEmail) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // ✅ Update
    await prisma.$transaction(async (tx) => {
      await tx.mR.update({
        where: { id },
        data: {
          name,
          email,
          phone, // ✅ FIXED
          salary: Number(salary),
        },
      });

      await tx.mRStore.deleteMany({
        where: { mrId: id },
      });

      const stores = await tx.store.findMany({
        where: { name: { in: assignedStores } },
      });

      await tx.mRStore.createMany({
        data: stores.map((s) => ({
          mrId: id,
          storeId: s.id,
        })),
      });
    });

    res.json({ message: "MR updated successfully" });
  } catch (error) {
    console.error("Error updating MR:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🔥 DELETE MR
router.delete("/delete/:id", async (req, res) => {
  try {
    const prisma = req.prisma;
    const id = Number(req.params.id);

    await prisma.mRStore.deleteMany({
      where: { mrId: id }, // ✅ first delete relations
    });

    await prisma.mR.delete({
      where: { id },
    });

    res.json({ message: "MR deleted successfully" });
  } catch (error) {
    console.error("Error deleting MR:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
