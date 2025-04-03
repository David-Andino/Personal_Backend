const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const empleadosController = require('../controllers/empleadoController');

// Configurar multer para guardar imágenes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join('C:', 'Users', 'ThinkPadHN2', 'Documents', 'public', 'personal', 'imagenEmpleado'));
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