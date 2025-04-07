const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const empleadosController = require('../controllers/empleadoController');

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Configuración avanzada de almacenamiento
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const timestamp = Date.now();
    const numero_identidad = req.body.numero_identidad || req.params.id;
    const extension = file.mimetype.split('/')[1];
    
    return {
      folder: 'empleados',
      public_id: `emp_${numero_identidad}_${timestamp}`,
      format: 'webp',
      transformation: [
        { width: 500, height: 500, crop: 'limit', quality: 'auto' }
      ],
      overwrite: false // Importante para evitar conflictos
    };
  }
});

// Configuración de Multer con mejor manejo de errores
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (validTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG, WEBP)'));
    }
  }
});

// Middleware mejorado para errores
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: 'Error al subir la imagen',
      details: err.code === 'LIMIT_FILE_SIZE' 
        ? 'El tamaño excede el límite de 5MB' 
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

// Rutas
router.post(
  '/crear',
  upload.single('fotografia'),
  handleUploadErrors,
  empleadosController.crearEmpleado
);

router.put(
  '/:id',
  upload.single('fotografia'),
  handleUploadErrors,
  empleadosController.actualizarEmpleado
);

router.get('/', empleadosController.obtenerEmpleados);
router.get('/:id', empleadosController.obtenerEmpleadoPorId);
router.delete('/:id', empleadosController.eliminarEmpleado);

module.exports = router;