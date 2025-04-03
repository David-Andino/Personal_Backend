require("dotenv").config();
const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');
const empleadosRoutes = require('./routes/empleadoRoute');
const asistenciaRoutes = require('./routes/asistenciaRoute');

// Middleware
app.use(cors());
app.use(express.json());

app.use('/imagenesEmpleados', express.static(path.join('C:', 'Users', 'ThinkPadHN2', 'Documents', 'public', 'personal', 'imagenEmpleado')));
// Rutas
app.use('/api/empleados', empleadosRoutes);
app.use('/api/asistencia', asistenciaRoutes);

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});