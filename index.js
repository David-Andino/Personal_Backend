require("dotenv").config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const empleadosRoutes = require('./routes/empleadoRoute');
const asistenciaRoutes = require('./routes/asistenciaRoute');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Servir imágenes de empleados desde carpeta pública
//app.use('/imagenesEmpleados', express.static(path.join(__dirname, 'uploads', 'empleados')));

// Rutas de la API
app.use('/api/empleados', empleadosRoutes);
app.use('/api/asistencia', asistenciaRoutes);

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
