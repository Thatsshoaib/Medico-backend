const express = require("express");
const router = express.Router();
const db = require("../Config/db");

router.post("/add", async (req, res) => {
  const { name, assignedStores, salary } = req.body;
  console.log("Received Data:", req.body);  // Debugging

  if (
    !name ||
    !Array.isArray(assignedStores) ||
    assignedStores.length === 0 ||
    !salary
  ) {
    return res
      .status(400)
      .json({ error: "Name, assigned stores, and salary are required" });
  }

  try {
    // Insert MR into mrs table
    const [mrResult] = await db.query(
      "INSERT INTO mrs (name, salary) VALUES (?, ?)",
      [name, salary]
    );

    const mrId = mrResult.insertId;

    // Convert store names to IDs
    let storeValues = [];
    for (let storeName of assignedStores) {
      const [store] = await db.query(
        "SELECT id FROM medical_stores WHERE name = ?",
        [storeName]
      );

      if (store.length === 0) {
        return res
          .status(400)
          .json({ error: `Store '${storeName}' not found` });
      }

      storeValues.push([mrId, store[0].id]);
    }

    // Insert assigned store IDs into mr_stores table
    await db.query("INSERT INTO mr_stores (mr_id, store_id) VALUES ?", [
      storeValues,
    ]);

    res.status(201).json({ message: "MR added successfully" });
  } catch (error) {
    console.error("Error adding MR:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const [mrs] = await db.query("SELECT * FROM mrs");

    // Fetch assigned stores for each MR
    for (const mr of mrs) {
      const [stores] = await db.query(
        `SELECT ms.name FROM mr_stores 
         JOIN medical_stores ms ON mr_stores.store_id = ms.id
         WHERE mr_stores.mr_id = ?`,
        [mr.id]
      );

      // Assign store names to MR object
      mr.assigned_stores = stores.map((store) => store.name);
    }

    res.json(mrs);
  } catch (error) {
    console.error("Error fetching MRs:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch MR details
    const [mrRows] = await db.query("SELECT * FROM mrs WHERE id = ?", [id]);
    if (mrRows.length === 0) {
      return res.status(404).json({ error: "MR not found" });
    }
    const mr = mrRows[0];

    // Fetch assigned store names
    const [stores] = await db.query(
      `SELECT ms.id, ms.name FROM mr_stores 
       JOIN medical_stores ms ON mr_stores.store_id = ms.id
       WHERE mr_stores.mr_id = ?`,
      [id]
    );

    // Add store names to the response
    res.json({ ...mr, assignedStores: stores.map(store => store.name) });
  } catch (error) {
    console.error("Error fetching MR:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.put("/edit/:id", async (req, res) => {
  const { name, assignedStores, salary } = req.body;
  const { id } = req.params;

  if (
    !name ||
    !Array.isArray(assignedStores) ||
    assignedStores.length === 0 ||
    !salary ||
    isNaN(Number(salary)) ||
    Number(salary) <= 0
  ) {
    return res.status(400).json({ error: "Valid name, assigned stores, and salary are required" });
  }

  const connection = await db.getConnection(); // get a connection for transaction
  try {
    await connection.beginTransaction();

    // Check if MR exists
    const [mrRows] = await connection.query("SELECT id FROM mrs WHERE id = ?", [id]);
    if (mrRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "MR not found" });
    }

    // Update MR
    await connection.query("UPDATE mrs SET name = ?, salary = ? WHERE id = ?", [name, salary, id]);

    // Delete old stores
    await connection.query("DELETE FROM mr_stores WHERE mr_id = ?", [id]);

    // Fetch all store IDs at once for the assignedStores
    const [storeRows] = await connection.query(
      "SELECT id, name FROM medical_stores WHERE name IN (?)",
      [assignedStores]
    );

    if (storeRows.length !== assignedStores.length) {
      // Find missing stores
      const foundStoreNames = storeRows.map((s) => s.name);
      const missingStores = assignedStores.filter((s) => !foundStoreNames.includes(s));
      await connection.rollback();
      return res.status(400).json({ error: `Store(s) not found: ${missingStores.join(", ")}` });
    }

    // Prepare insert values
    const storeValues = storeRows.map((store) => [id, store.id]);

    // Insert new stores
    await connection.query("INSERT INTO mr_stores (mr_id, store_id) VALUES ?", [storeValues]);

    await connection.commit();
    res.json({ message: "MR updated successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating MR:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    connection.release();
  }
});


// ✅ Delete MR and Their Assigned Stores
router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await db.query("DELETE FROM mr_stores WHERE mr_id = ?", [id]);
    await db.query("DELETE FROM mrs WHERE id = ?", [id]);

    res.json({ message: "MR deleted successfully" });
  } catch (error) {
    console.error("Error deleting MR:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;



// import React, { useEffect, useState, useRef } from "react";
// import axios from "axios";
// import { FaTrash, FaEdit, FaUserPlus, FaSearch, FaCheckCircle } from "react-icons/fa";

// const ManageMRs = () => {
//   // Existing state and refs
//   const [mrs, setMrs] = useState([]);
//   const [stores, setStores] = useState([]);
//   const [filteredStores, setFilteredStores] = useState([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [mrSearchTerm, setMrSearchTerm] = useState(""); // State for MR search term
//   const [name, setName] = useState("");
//   const [assignedStores, setAssignedStores] = useState([]);
//   const [salary, setSalary] = useState("");
//   const [editingMR, setEditingMR] = useState(null);
//   const [dropdownOpen, setDropdownOpen] = useState(false);
//   const dropdownRef = useRef(null);

//   useEffect(() => {
//     fetchMRs();
//     fetchStores();

//     // Event listener to close dropdown when clicking outside
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   const fetchMRs = async () => {
//     try {
//       const res = await axios.get("http://localhost:5000/api/mrs/");
//       setMrs(res.data);
//     } catch (error) {
//       console.error("Error fetching MRs:", error);
//     }
//   };

//   const fetchStores = async () => {
//     try {
//       const res = await axios.get("http://localhost:5000/api/stores/");
//       filterAvailableStores(res.data);
//     } catch (error) {
//       console.error("Error fetching stores:", error);
//     }
//   };

//   const filterAvailableStores = (allStores) => {
//     const assignedStoreNames = new Set(mrs.flatMap((mr) => mr.assigned_stores || []));
//     const availableStores = allStores.filter((store) => !assignedStoreNames.has(store.name));
//     setStores(availableStores);
//     setFilteredStores(availableStores);
//   };

//   const addOrUpdateMR = async () => {
//     if (!name || assignedStores.length === 0 || !salary) {
//       alert("Please enter MR name, select at least one store, and provide salary.");
//       return;
//     }

//     try {
//       if (editingMR) {
//         await axios.put(`http://localhost:5000/api/mrs/edit/${editingMR.id}`, {
//           name,
//           assignedStores,
//           salary,
//         });
//       } else {
//         await axios.post("http://localhost:5000/api/mrs/add", {
//           name,
//           assignedStores,
//           salary,
//         });
//       }

//       setName("");
//       setAssignedStores([]);
//       setSalary("");
//       setEditingMR(null);
//       fetchMRs();
//       fetchStores();
//     } catch (error) {
//       console.error("Error adding/updating MR:", error);
//     }
//   };

//   const deleteMR = async (id) => {
//     try {
//       await axios.delete(`http://localhost:5000/api/mrs/delete/${id}`);
//       fetchMRs();
//       fetchStores();
//     } catch (error) {
//       console.error("Error deleting MR:", error);
//     }
//   };

//   const startEditing = (mr) => {
//     setEditingMR(mr);
//     setName(mr.name);
//     setAssignedStores(mr.assigned_stores || []);
//     setSalary(mr.salary);
//   };

//   const handleSearch = (e) => {
//     setSearchTerm(e.target.value);
//     setDropdownOpen(true);
//     const filtered = stores.filter((store) =>
//       store.name.toLowerCase().includes(e.target.value.toLowerCase())
//     );
//     setFilteredStores(filtered);
//   };

//   const toggleStoreSelection = (storeName) => {
//     setAssignedStores((prev) => {
//       const updatedAssignedStores = prev.includes(storeName)
//         ? prev.filter((s) => s !== storeName)
//         : [...prev, storeName];
//       // Update the searchTerm to reflect the selected store names
//       setSearchTerm(updatedAssignedStores.join(", "));
//       return updatedAssignedStores;
//     });
//   };
//   const removeAssignedStore = (storeName) => {
//   setAssignedStores((prev) => {
//     const updatedStores = prev.filter((s) => s !== storeName);
//     setSearchTerm(updatedStores.join(", "));
//     return updatedStores;
//   });
// };

//   // MR search functionality
//   const filteredMRs = mrs.filter((mr) =>
//     mr.name.toLowerCase().includes(mrSearchTerm.toLowerCase())
//   );

//   // Close dropdown when clicking outside
//   const handleClickOutside = (event) => {
//     if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
//       setDropdownOpen(false);
//     }