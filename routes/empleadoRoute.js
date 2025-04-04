const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const empleadosController = require('../controllers/empleadoController');

// Crear la ruta donde se guardarán las imágenes
const uploadPath = path.join(__dirname, '..', 'uploads', 'empleados');

// Crear la carpeta si no existe
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

// Configurar multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const numero_identidad = req.body.numero_identidad;
        const extension = file.originalname.split('.').pop();
        cb(null, `${numero_identidad}.${extension}`);
    },
});

const upload = multer({ storage });

// Ruta para crear un empleado (con subida de imagen)
router.post('/crear', upload.single('fotografia'), empleadosController.crearEmpleado);

// Otras rutas
router.get('/', empleadosController.obtenerEmpleados);
router.get('/:id', empleadosController.obtenerEmpleadoPorId);
router.put('/:id', upload.single('fotografia'), empleadosController.actualizarEmpleado);
router.delete('/:id', empleadosController.eliminarEmpleado);

module.exports = router;
