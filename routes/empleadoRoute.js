const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const empleadosController = require('../controllers/empleadoController');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // Fuerza HTTPS
});

// Configuración de almacenamiento en Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Usamos el número de identidad como ID público
    const numero_identidad = req.body.numero_identidad;
    const extension = file.originalname.split('.').pop().toLowerCase();
    
    // Validamos extensiones permitidas
    const formatosPermitidos = ['jpg', 'jpeg', 'png', 'webp'];
    if (!formatosPermitidos.includes(extension)) {
      throw new Error('Formato de imagen no soportado');
    }

    return {
      folder: 'empleados', // Carpeta en Cloudinary
      public_id: `empleado_${numero_identidad}`, // ID único
      format: extension,
      transformation: [
        { width: 500, height: 500, crop: 'limit', quality: 'auto' } // Optimización automática
      ]
    };
  }
});

// Configuración de Multer
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // Límite de 5MB
  },
  fileFilter: (req, file, cb) => {
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
    if (tiposPermitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG, WEBP)'), false);
    }
  }
});

// Middleware para manejar errores de subida
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ 
      error: 'Error al subir la imagen',
      details: err.code === 'LIMIT_FILE_SIZE' 
        ? 'La imagen excede el límite de 5MB' 
        : err.message
    });
  } else if (err) {
    return res.status(400).json({ 
      error: 'Error en el archivo',
      details: err.message
    });
  }
  next();
};

// Ruta para crear empleado (con subida de imagen)
router.post(
  '/crear', 
  upload.single('fotografia'), 
  handleUploadErrors,
  empleadosController.crearEmpleado
);

// Ruta para actualizar empleado (con posible actualización de imagen)
router.put(
  '/:id',
  upload.single('fotografia'),
  handleUploadErrors,
  empleadosController.actualizarEmpleado
);

// Otras rutas (sin manejo de archivos)
router.get('/', empleadosController.obtenerEmpleados);
router.get('/:id', empleadosController.obtenerEmpleadoPorId);
router.delete('/:id', empleadosController.eliminarEmpleado);

module.exports = router;