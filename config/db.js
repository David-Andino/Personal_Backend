require('dotenv').config(); // Solo necesario en desarrollo
const mysql = require('mysql2/promise'); // Usamos la versión con promesas

// Configuración para Railway (producción) o desarrollo local
const dbConfig = {
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway',
  ssl: process.env.NODE_ENV === 'production' ? { 
    rejectUnauthorized: false // Obligatorio para Railway
  } : null,
  waitForConnections: true,
  connectionLimit: 10, // Número óptimo para la mayoría de aplicaciones
  queueLimit: 0,
  connectTimeout: 10000 // 10 segundos de timeout
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
    // En producción, podrías querer reintentar o terminar el proceso
    if (process.env.NODE_ENV === 'production') {
      process.exit(1); // Termina la aplicación si no hay conexión en producción
    }
  }
})();

// Manejo de errores del pool
pool.on('error', (err) => {
  console.error('🚨 Error en el pool de MySQL:', err.message);
});

// Exporta el pool con interfaz de promesas
module.exports = pool;