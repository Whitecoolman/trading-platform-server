// db.js
const { Pool } = require("pg");
require("dotenv").config(); // Load environment variables from .env file

// Create a new pool instance using the DATABASE_URL from environment variables
// const pool = new Pool({
//   connectionString: process.env.POSTGRES_URL,
// });

const pool = new Pool({
  user: "postgres", // Replace with your PostgreSQL username
  host: "127.0.0.1", // Host name (default is localhost)
  database: "mydb", // Replace with your database name
  password: "clrhslrjw123", // Replace with your password
  port: 5432, // Default PostgreSQL port
  // ssl: {
  //   rejectUnauthorized: false, // Accept self-signed certificates
  // },
});

// Function to connect to the database
const connect = async () => {
  try {
    const client = await pool.connect();
    console.log("Connected to the database");

    return client;
  } catch (error) {
    console.error("Database connection error:", error);
    throw error; // Propagate the error
  }
};

// Function to query the database
const query = async (text, params) => {
  const client = await connect(); // Get a client connection
  try {
    const res = await client.query(text, params);
    return res;
  } catch (error) {
    console.error("Database query error:", error);
    throw error; // Propagate the error
  } finally {
    client.release(); // Release the client back to the pool
  }
};

// Export the pool and query function
module.exports = { pool, connect, query };
