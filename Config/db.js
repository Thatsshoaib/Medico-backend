const mysql = require("mysql2");

const db = mysql.createPool({
  host: "localhost",             // ✅ Local MySQL server
  user: "root",                  // ✅ Default MySQL user (change if needed)
  password: "Raza@1105",         // ✅ Your actual password (keep secure)
  database: "medisales",         // ✅ Your database name
  waitForConnections: true,      // ✅ Good for production-like behavior
  connectionLimit: 10,           // ✅ Limits simultaneous connections
  queueLimit: 0,                 // ✅ No queue limit
});

const dbPromise = db.promise();  // ✅ Using promise-based API for async/await

module.exports = dbPromise;      // ✅ Export for use in other files



