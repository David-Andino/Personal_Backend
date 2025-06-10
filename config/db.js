require('dotenv').config();
const mysql = require('mysql2/promise'); 


const dbConfig = {
  host: process.env.MYSQLHOST || process.env.DB_HOST,
  port: process.env.MYSQLPORT || process.env.DB_PORT,
  user: process.env.MYSQLUSER || process.env.DB_USER,
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
  database: process.env.MYSQLDATABASE || process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { 
    rejectUnauthorized: false
  } : null,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000
};

// Crea el pool de conexiones
const pool = mysql.createPool(dbConfig);

// Verificación de conexión al iniciar
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conectado a MySQL en:', dbConfig.host);
    console.log(`📦 Base de datos: ${dbConfig.database}`);
    connection.release();
  } catch (err) {
    console.error('❌ Error de conexión a MySQL:', {
      code: err.code,
      message: err.message,
      config: {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database
      }
    });
    
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
})();

// Manejo de errores del pool
pool.on('error', (err) => {
  console.error('🚨 Error en el pool de MySQL:', err.message);
});

// Exporta el pool con interfaz de promesas
module.exports = pool;
