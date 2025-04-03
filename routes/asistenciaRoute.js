const express = require('express');
const router = express.Router();
const asistenciaController = require('../controllers/asistenciaController');

// Registro de asistencias
router.post('/', asistenciaController.registrarAsistencia);
router.post('/registrar', asistenciaController.registrarEntradaSalida);

// Actualización
router.put('/:id', asistenciaController.actualizarAsistencia);

// Consultas
router.get('/:id', asistenciaController.obtenerAsistencia);
router.get('/fecha/:fecha', asistenciaController.obtenerAsistenciasPorFecha);
router.get('/empleado/:empleadoId', asistenciaController.obtenerAsistenciasPorEmpleado);
router.get('/resumen/diario', asistenciaController.obtenerResumenDiario);

// Cierre manual de jornada
router.post('/cerrar-jornada', asistenciaController.cerrarJornada);

// Obtener empleados sin salida
router.get('/sin-salida/:fecha', asistenciaController.obtenerRegistrosSinSalida);

module.exports = router;