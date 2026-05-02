const express = require("express");
const router = express.Router();

// ✅ SINGLE STOCK ADD (Existing)
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

        const existingStock = await tx.stock.findFirst({
          where: { productName: medicine_name }
        });

        let stock;
        if (existingStock) {
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

// ✅ BULK STOCK IMPORT (NEW - For CSV/Excel Import)
router.post("/bulk-import", async (req, res) => {
  try {
    const { dealer_name, medicines, action = "update" } = req.body;
    const prisma = req.prisma;

    // Validation
    if (!dealer_name || !Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Dealer name and medicines array are required",
      });
    }

    // Validate each medicine
    for (let i = 0; i < medicines.length; i++) {
      const med = medicines[i];
      if (!med.medicine_name || !med.quantity || !med.price) {
        return res.status(400).json({
          success: false,
          message: `Medicine at index ${i} is missing required fields (medicine_name, quantity, price)`,
        });
      }
      if (isNaN(med.quantity) || med.quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for medicine: ${med.medicine_name}`,
        });
      }
      if (isNaN(med.price) || med.price <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid price for medicine: ${med.medicine_name}`,
        });
      }
    }

    const results = {
      successful: [],
      failed: [],
      updated: [],
      created: []
    };

    // Process all medicines in transaction for data consistency
    await prisma.$transaction(async (tx) => {
      for (const med of medicines) {
        try {
          const { medicine_name, quantity, price } = med;
          
          // Check if stock exists
          const existingStock = await tx.stock.findFirst({
            where: { productName: medicine_name }
          });

          let stock;
          let status = '';

          if (existingStock) {
            // Update existing stock
            if (action === 'replace') {
              // Replace mode: Set exact quantity
              stock = await tx.stock.update({
                where: { id: existingStock.id },
                data: {
                  quantity: Number(quantity),
                  price: Number(price),
                },
              });
              status = 'replaced';
            } else {
              // Update mode: Add to existing quantity
              stock = await tx.stock.update({
                where: { id: existingStock.id },
                data: {
                  quantity: {
                    increment: Number(quantity),
                  },
                  price: Number(price), // Update price to latest
                },
              });
              status = 'updated';
            }
            
            results.updated.push({
              medicine_name,
              old_quantity: existingStock.quantity,
              new_quantity: stock.quantity,
              price: stock.price
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
            status = 'created';
            results.created.push({
              medicine_name,
              quantity: stock.quantity,
              price: stock.price
            });
          }

          results.successful.push({
            medicine_name,
            quantity: stock.quantity,
            price: stock.price,
            status
          });

        } catch (error) {
          results.failed.push({
            medicine_name: med.medicine_name,
            error: error.message
          });
        }
      }
    });

    res.status(201).json({
      success: true,
      message: `Successfully processed ${results.successful.length} out of ${medicines.length} medicines`,
      data: {
        dealer_name,
        total: medicines.length,
        successful: results.successful.length,
        failed: results.failed.length,
        updated: results.updated.length,
        created: results.created.length,
        details: {
          successful_items: results.successful,
          failed_items: results.failed,
          updated_items: results.updated,
          created_items: results.created
        }
      }
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
});

// ✅ BULK IMPORT WITH FILE UPLOAD (Optional - Direct CSV upload)
router.post("/bulk-upload", async (req, res) => {
  try {
    const { dealer_name, medicines, mode = "update" } = req.body;
    const prisma = req.prisma;

    // Validation
    if (!dealer_name) {
      return res.status(400).json({
        success: false,
        message: "Dealer name is required",
      });
    }

    if (!Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Medicines array is required",
      });
    }

    // Validate and sanitize medicines
    const validatedMedicines = [];
    const errors = [];

    for (let i = 0; i < medicines.length; i++) {
      const med = medicines[i];
      
      if (!med.medicine_name || med.medicine_name.trim() === '') {
        errors.push(`Row ${i + 1}: Medicine name is required`);
        continue;
      }
      
      const quantity = Number(med.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        errors.push(`Row ${i + 1}: Valid quantity is required for ${med.medicine_name}`);
        continue;
      }
      
      const price = Number(med.price);
      if (isNaN(price) || price <= 0) {
        errors.push(`Row ${i + 1}: Valid price is required for ${med.medicine_name}`);
        continue;
      }
      
      validatedMedicines.push({
        medicine_name: med.medicine_name.trim(),
        quantity: quantity,
        price: price
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation errors found",
        errors: errors
      });
    }

    const results = {
      created: [],
      updated: [],
      failed: []
    };

    // Process each medicine
    for (const med of validatedMedicines) {
      try {
        const existingStock = await prisma.stock.findFirst({
          where: { productName: med.medicine_name }
        });

        if (existingStock) {
          // Update existing
          let newQuantity;
          if (mode === 'replace') {
            newQuantity = med.quantity;
          } else {
            newQuantity = existingStock.quantity + med.quantity;
          }
          
          const updated = await prisma.stock.update({
            where: { id: existingStock.id },
            data: {
              quantity: newQuantity,
              price: med.price
            }
          });
          
          results.updated.push({
            medicine_name: med.medicine_name,
            old_quantity: existingStock.quantity,
            new_quantity: updated.quantity,
            price: updated.price
          });
        } else {
          // Create new
          const created = await prisma.stock.create({
            data: {
              productName: med.medicine_name,
              quantity: med.quantity,
              price: med.price
            }
          });
          
          results.created.push({
            medicine_name: med.medicine_name,
            quantity: created.quantity,
            price: created.price
          });
        }
      } catch (error) {
        results.failed.push({
          medicine_name: med.medicine_name,
          error: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Successfully imported ${results.created.length + results.updated.length} medicines`,
      data: {
        dealer_name,
        mode,
        total: validatedMedicines.length,
        created: results.created.length,
        updated: results.updated.length,
        failed: results.failed.length,
        details: results
      }
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
});

// ✅ GET ALL MEDICINES (Existing - Improved)
router.get("/get-med", async (req, res) => {
  try {
    const prisma = req.prisma;
    
    const meds = await prisma.stock.findMany({
      select: {
        id: true,
        productName: true,
        price: true,
        quantity: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        productName: 'asc'
      }
    });

    // Remove duplicates and keep latest
    const medicineMap = new Map();
    
    meds.forEach(med => {
      if (!medicineMap.has(med.productName)) {
        medicineMap.set(med.productName, {
          id: med.id,
          name: med.productName,
          price: med.price,
          quantity: med.quantity
        });
      } else {
        // If duplicate exists, keep the one with higher quantity or latest price
        const existing = medicineMap.get(med.productName);
        if (med.quantity > existing.quantity) {
          medicineMap.set(med.productName, {
            id: med.id,
            name: med.productName,
            price: med.price,
            quantity: med.quantity
          });
        }
      }
    });

    const medicines = Array.from(medicineMap.values());

    res.json({
      success: true,
      medicines: medicines,
      count: medicines.length
    });

  } catch (error) {
    console.error('Error fetching medicines:', error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching medicines" 
    });
  }
});

// ✅ GET ALL STOCK (Existing)
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
      count: stock.length
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// ✅ DELETE MEDICINE (Optional - For cleanup)
router.delete("/delete-med/:id", async (req, res) => {
  try {
    const prisma = req.prisma;
    const { id } = req.params;

    const deleted = await prisma.stock.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: `Medicine "${deleted.productName}" deleted successfully`,
      deleted: deleted
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete medicine"
    });
  }
});

// ✅ BULK DELETE MEDICINES (Optional)
router.post("/bulk-delete", async (req, res) => {
  try {
    const prisma = req.prisma;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "IDs array is required"
      });
    }

    const deleted = await prisma.stock.deleteMany({
      where: {
        id: { in: ids.map(id => parseInt(id)) }
      }
    });

    res.json({
      success: true,
      message: `Deleted ${deleted.count} medicines successfully`,
      count: deleted.count
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete medicines"
    });
  }
});

module.exports = router;