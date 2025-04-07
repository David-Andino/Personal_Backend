require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');

const empleadosRoutes = require('./routes/empleadoRoute');
const asistenciaRoutes = require('./routes/asistenciaRoute');

const app = express();

// 1. Configuración de seguridad mejorada
app.use(helmet());
app.disable('x-powered-by');

// 2. Configuración optimizada de CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://tu-frontend.com'] 
    : ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// 3. Limitador de tasa para prevenir ataques
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Demasiadas solicitudes desde esta IP'
  }
});
app.use(limiter);

// 4. Configuración del body parser con límites aumentados
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Proxy para Cloudinary (opcional)
if (process.env.CLOUDINARY_PROXY === 'true') {
  app.use('/cloudinary', createProxyMiddleware({
    target: 'https://api.cloudinary.com',
    changeOrigin: true,
    pathRewrite: {
      '^/cloudinary': `/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}`
    },
    headers: {
      'Authorization': `Basic ${Buffer.from(`${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`).toString('base64')}`
    }
  }));
}

// 6. Rutas de la API
app.use('/api/empleados', empleadosRoutes);
app.use('/api/asistencia', asistenciaRoutes);

// 7. Ruta de verificación de salud
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// 8. Manejo centralizado de errores
app.use((err, req, res, next) => {
  console.error('Error global:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    path: req.path,
    method: req.method
  });

  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: status === 500 ? 'Error interno del servidor' : err.message
  });
});

// 9. Configuración para producción
if (process.env.NODE_ENV === 'production') {
  // Servir archivos estáticos del frontend
  app.use(express.static(path.join(__dirname, 'client', 'build')));
  
  // Manejar rutas del frontend
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
  });
}

// 10. Iniciar servidor con manejo de cierre
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🔧 Entorno: ${process.env.NODE_ENV || 'development'}`);
});

// Manejo de cierre elegante
process.on('SIGTERM', () => {
  console.log('🛑 Recibido SIGTERM. Cerrando servidor...');
  server.close(() => {
    console.log('🔴 Servidor cerrado');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('⚠️ Error no manejado:', err);
  server.close(() => process.exit(1));
});