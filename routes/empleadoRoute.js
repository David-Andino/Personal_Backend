require('dotenv').config();
const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const empleadosController = require('../controllers/empleadoController');

// Validación de credenciales Cloudinary
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  throw new Error('Faltan credenciales de Cloudinary en las variables de entorno');
}

// Configuración mejorada de Cloudinary para producción
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  cname: process.env.CLOUDINARY_CNAME || undefined, // Para dominios personalizados
  private_cdn: process.env.NODE_ENV === 'production', // Habilitar CDN privado en producción
  secure_distribution: process.env.NODE_ENV === 'production' ? 'res.cloudinary.com' : undefined
});

// Configuración de almacenamiento optimizada
const createStorage = () => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: (req, file) => {
      const identifier = req.body.numero_identidad || req.params.id || 'temp';
      return {
        folder: process.env.NODE_ENV === 'production' ? 'empleados_prod' : 'empleados_dev',
        public_id: `emp_${identifier}_${Date.now()}`,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        format: 'webp',
        transformation: [
          { width: 800, height: 800, crop: 'limit', quality: 'auto:best' }
        ],
        resource_type: 'image',
        overwrite: false,
        invalidate: process.env.NODE_ENV === 'production' // Invalidar caché CDN en producción
      };
    }
  });
};

const storage = createStorage();

// Configuración mejorada de Multer
const fileFilter = (req, file, cb) => {
  const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (validMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de imagen no soportado. Use JPEG, PNG o WEBP'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB (aumentado para producción)
    files: 1
  },
  fileFilter: fileFilter
});

// Middleware de errores mejorado
const handleUploadErrors = (err, req, res, next) => {
  if (err) {
    console.error('Error en upload:', {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      body: req.body
    });

    let status = 400;
    let message = 'Error al procesar el archivo';

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        message = 'El archivo excede el límite de 10MB';
      } else if (err.code === 'LIMIT_FILE_COUNT') {
        message = 'Solo se permite un archivo por solicitud';
      }
    }

    return res.status(status).json({
      success: false,
      error: message,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  next();
};

// Middleware de validación de datos
const validateEmployeeData = (req, res, next) => {
  const requiredFields = ['nombre', 'puesto', 'tipo_contrato', 'sueldo_base'];
  const missingFields = requiredFields.filter(field => !req.body[field]);
  
  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Faltan campos obligatorios',
      missingFields
    });
  }
  
  next();
};

// Rutas protegidas
router.post(
  '/crear',
  upload.single('fotografia'),
  handleUploadErrors,
  validateEmployeeData,
  empleadosController.crearEmpleado
);

router.put(
  '/:id',
  upload.single('fotografia'),
  handleUploadErrors,
  validateEmployeeData,
  empleadosController.actualizarEmpleado
);

router.get('/', empleadosController.obtenerEmpleados);
router.get('/:id', empleadosController.obtenerEmpleadoPorId);
router.delete('/:id', empleadosController.eliminarEmpleado);

module.exports = router;