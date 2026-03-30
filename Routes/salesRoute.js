const express = require("express");
const router = express.Router();

router.post("/add", async (req, res) => {
  try {
    const { mr_id, store_id, total_sales, date, photo } = req.body;

    if (!mr_id || !store_id || !total_sales || !date || !photo) {
      return res.status(400).json({ error: "All fields required" });
    }

    const sale = await prisma.sale.create({
      data: {
        mrId: Number(mr_id),
        storeId: Number(store_id),
        totalSales: Number(total_sales),
        date: new Date(date),
        photo
      }
    });

    res.status(201).json({ saleID: sale.id });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create sale" });
  }
});


router.post("/salesdetail", async (req, res) => {
  try {
    const { saleID, medicine_name, quantity, price, total_price, date } = req.body;

    if (!saleID || !medicine_name || !quantity || !price || !total_price || !date) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await prisma.$transaction(async (tx) => {

      // ✅ Check stock
      const stock = await tx.stock.findUnique({
        where: { medicineName: medicine_name }
      });

      if (!stock) {
        throw new Error("Medicine not found in stock");
      }

      if (stock.totalQuantity < quantity) {
        throw new Error("Insufficient stock");
      }

      // ✅ Create sale detail
      await tx.saleDetail.create({
        data: {
          saleId: Number(saleID),
          medicineName: medicine_name,
          quantity: Number(quantity),
          price: Number(price),
          totalPrice: Number(total_price),
          date: new Date(date)
        }
      });

      // ✅ Update stock
      await tx.stock.update({
        where: { medicineName: medicine_name },
        data: {
          totalQuantity: stock.totalQuantity - quantity
        }
      });

    });

    res.status(201).json({
      message: "Sale detail added & stock updated"
    });

  } catch (error) {
    console.error(error.message);
    res.status(400).json({ error: error.message });
  }
});


router.get("/currentday-sales/mr/:mrId", async (req, res) => {
  try {
    const mrId = Number(req.params.mrId);

    const start = new Date();
    start.setHours(0,0,0,0);

    const end = new Date();
    end.setHours(23,59,59,999);

    const sales = await prisma.sale.findMany({
      where: {
        mrId,
        date: { gte: start, lte: end }
      },
      include: {
        store: true,
        details: true
      },
      orderBy: { date: "desc" }
    });

    const formatted = sales.flatMap(sale =>
      sale.details.map(detail => ({
        sale_id: sale.id,
        total_sales: sale.totalSales,
        sale_date: sale.date,
        photo: sale.photo,
        detail_id: detail.id,
        medicine_name: detail.medicineName,
        quantity: detail.quantity,
        price: detail.price,
        total_price: detail.totalPrice,
        store_id: sale.store.id,
        store_name: sale.store.name
      }))
    );

    res.json(formatted);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get("/all", async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.query;

    let where = {};

    const now = new Date();

    if (filter) {
      if (filter === "last7days") {
        where.date = { gte: new Date(now.setDate(now.getDate() - 7)) };
      }
      if (filter === "last15days") {
        where.date = { gte: new Date(now.setDate(now.getDate() - 15)) };
      }
      if (filter === "last30days") {
        where.date = { gte: new Date(now.setDate(now.getDate() - 30)) };
      }
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        mr: true,
        store: true,
        details: true
      },
      orderBy: { date: "desc" }
    });

    const formatted = sales.flatMap(sale =>
      sale.details.map(d => ({
        saleID: sale.id,
        medicine_name: d.medicineName,
        quantity: d.quantity,
        price: d.price,
        date: sale.date,
        mr_name: sale.mr.name,
        store_name: sale.store.name
      }))
    );

    res.status(200).json({ success: true, sales: formatted });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
});

module.exports = router; 