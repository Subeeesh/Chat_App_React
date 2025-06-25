require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};

const pool = mysql.createPool(dbConfig);

async function getConnection() {
  try {
    const connection = await pool.getConnection();
    return connection;
  } catch (error) {
    console.error('Error getting connection:', error);
    throw error;
  }
}

async function testConnection() {
    try {
        const connection = await getConnection();
        console.log('Database connection successful!');
        connection.release();
    } catch (error) {
        console.error('Database connection failed:', error);
    }
}

testConnection();

module.exports = { getConnection };