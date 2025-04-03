const db = require('../config/db');

// Crear un nuevo empleado
exports.crearEmpleado = async (req, res) => {
    try {
        const {
            nombre,
            puesto,
            tipo_contrato,
            sueldo_base,
            activo, // Ahora esperamos 'SI' o 'NO'
            fecha_contratacion,
            numero_identidad,
            huella,
            telefono,
            domicilio,
            estado_civil,
            sexo,
            fecha_egreso,
            nivel_educativo,
            nombre_emergencia,
            telefono_emergencia,
            lugar_nacimiento,
            fecha_nacimiento,
            tipo_contrato_empleo,
            beneficiarios,
            nacionalidad
        } = req.body;

        // Validar campos obligatorios
        if (!nombre || !puesto || !tipo_contrato || !sueldo_base || !fecha_contratacion || !numero_identidad || !telefono || !domicilio || !estado_civil || !sexo || !nivel_educativo || !nombre_emergencia || !telefono_emergencia || !lugar_nacimiento || !fecha_nacimiento || !tipo_contrato_empleo || !nacionalidad) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        // Validar que activo sea 'SI' o 'NO'
        if (activo !== 'SI' && activo !== 'NO') {
            return res.status(400).json({ error: 'El campo activo debe ser "SI" o "NO"' });
        }

        // Convertir fecha_egreso a NULL si está vacía
        const fechaEgresoValue = fecha_egreso === 'null' || !fecha_egreso ? null : fecha_egreso;

        // Obtener el nombre del archivo de la imagen (si se subió)
        const ruta_fotografia = req.file ? req.file.filename : null;

        // Ejecutar la consulta SQL
        const [result] = await db.query(
            `INSERT INTO empleados 
            (nombre, puesto, tipo_contrato, sueldo_base, activo, fecha_contratacion, numero_identidad, ruta_huella, ruta_fotografia, telefono, domicilio, estado_civil, sexo, fecha_egreso, nivel_educativo, nombre_emergencia, telefono_emergencia, lugar_nacimiento, fecha_nacimiento, tipo_contrato_empleo, beneficiarios, nacionalidad) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nombre,
                puesto,
                tipo_contrato,
                sueldo_base,
                activo, // Usamos directamente el valor 'SI' o 'NO'
                fecha_contratacion,
                numero_identidad,
                huella || null,
                ruta_fotografia || null,
                telefono,
                domicilio,
                estado_civil,
                sexo,
                fechaEgresoValue,
                nivel_educativo,
                nombre_emergencia,
                telefono_emergencia,
                lugar_nacimiento,
                fecha_nacimiento,
                tipo_contrato_empleo,
                beneficiarios || null,
                nacionalidad
            ]
        );

        // Verificar el resultado de la consulta
        if (!result || !result.insertId) {
            throw new Error('No se pudo crear el empleado: resultado inválido');
        }

        // Respuesta exitosa
        res.status(201).json({ 
            message: 'Empleado creado exitosamente', 
            id: result.insertId,
            activo: activo // Devolvemos el estado para confirmación
        });
    } catch (err) {
        console.error('Error al crear empleado:', {
            message: err.message,
            stack: err.stack,
            body: req.body,
            file: req.file ? req.file.filename : 'No se subió archivo'
        });
        
        // Manejar errores específicos de MySQL para ENUM
        if (err.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
            return res.status(400).json({ 
                error: 'Valor inválido para el campo activo. Debe ser "SI" o "NO"' 
            });
        }
        
        res.status(500).json({ 
            error: 'Error al crear el empleado', 
            details: process.env.NODE_ENV === 'development' ? err.message : 'Error interno' 
        });
    }
};

// Obtener todos los empleados
exports.obtenerEmpleados = async (req, res) => {
    try {
        const [empleados] = await db.query('SELECT * FROM empleados');
        res.json(empleados);
    } catch (err) {
        console.error('Error al obtener empleados:', err);
        res.status(500).json({ error: err.message });
    }
};

// Obtener un empleado por su ID
exports.obtenerEmpleadoPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const [empleado] = await db.query('SELECT * FROM empleados WHERE id = ?', [id]);

        if (empleado.length === 0) {
            return res.status(404).json({ message: 'Empleado no encontrado' });
        }

        res.json(empleado[0]);
    } catch (err) {
        console.error('Error al obtener empleado por ID:', err);
        res.status(500).json({ error: err.message });
    }
};

// Actualizar un empleado
exports.actualizarEmpleado = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nombre,
            puesto,
            tipo_contrato,
            sueldo_base,
            activo, // Ahora esperamos 'SI' o 'NO'
            fecha_contratacion,
            numero_identidad,
            ruta_huella,
            telefono,
            domicilio,
            estado_civil,
            sexo,
            fecha_egreso,
            nivel_educativo,
            nombre_emergencia,
            telefono_emergencia,
            lugar_nacimiento,
            fecha_nacimiento,
            tipo_contrato_empleo,
            beneficiarios,
            nacionalidad
        } = req.body;

        // Validar campos requeridos
        if (!nombre || !puesto || !tipo_contrato || !sueldo_base || !fecha_contratacion || !numero_identidad) {
            return res.status(400).json({ message: 'Faltan campos requeridos' });
        }

        // Validar que activo sea 'SI' o 'NO'
        if (activo !== 'SI' && activo !== 'NO') {
            return res.status(400).json({ message: 'El campo activo debe ser "SI" o "NO"' });
        }

        // Convertir fecha_egreso a NULL si está vacía
        const fechaEgresoValue = fecha_egreso === 'null' || !fecha_egreso ? null : fecha_egreso;

        // Obtener el nombre del archivo de la imagen (si se subió)
        const ruta_fotografia = req.file ? req.file.filename : null;

        // Ejecutar la consulta SQL
        const [result] = await db.query(
            `UPDATE empleados 
            SET nombre = ?, puesto = ?, tipo_contrato = ?, sueldo_base = ?, activo = ?, fecha_contratacion = ?, numero_identidad = ?, 
                ruta_huella = IFNULL(?, ruta_huella), ruta_fotografia = IFNULL(?, ruta_fotografia), 
                telefono = ?, domicilio = ?, estado_civil = ?, sexo = ?, fecha_egreso = ?, nivel_educativo = ?, 
                nombre_emergencia = ?, telefono_emergencia = ?, lugar_nacimiento = ?, fecha_nacimiento = ?, 
                tipo_contrato_empleo = ?, beneficiarios = ?, nacionalidad = ?
            WHERE id = ?`,
            [
                nombre,
                puesto,
                tipo_contrato,
                sueldo_base,
                activo, // Usamos directamente 'SI' o 'NO'
                fecha_contratacion,
                numero_identidad,
                ruta_huella,
                ruta_fotografia,
                telefono,
                domicilio,
                estado_civil,
                sexo,
                fechaEgresoValue,
                nivel_educativo,
                nombre_emergencia,
                telefono_emergencia,
                lugar_nacimiento,
                fecha_nacimiento,
                tipo_contrato_empleo,
                beneficiarios,
                nacionalidad,
                id
            ]
        );

        // Verificar si se actualizó algún registro
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Empleado no encontrado' });
        }

        // Respuesta exitosa
        res.json({ 
            message: 'Empleado actualizado exitosamente',
            cambios: result.changedRows,
            activo: activo // Devolvemos el estado para confirmación
        });
    } catch (err) {
        console.error('Error al actualizar empleado:', {
            message: err.message,
            stack: err.stack,
            params: req.params,
            body: req.body,
            file: req.file ? req.file.filename : 'No se subió archivo'
        });

        // Manejar errores específicos de MySQL para ENUM
        if (err.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
            return res.status(400).json({ 
                message: 'Valor inválido para el campo activo. Debe ser "SI" o "NO"' 
            });
        }
        
        res.status(500).json({ 
            error: 'Error al actualizar el empleado', 
            details: process.env.NODE_ENV === 'development' ? err.message : 'Error interno' 
        });
    }
};

// Eliminar un empleado
exports.eliminarEmpleado = async (req, res) => {
    try {
        const { id } = req.params;

        // Ejecutar la consulta SQL
        const [result] = await db.query('DELETE FROM empleados WHERE id = ?', [id]);

        // Verificar si se eliminó algún registro
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Empleado no encontrado' });
        }

        // Respuesta exitosa
        res.json({ message: 'Empleado eliminado' });
    } catch (err) {
        console.error('Error al eliminar empleado:', err);
        res.status(500).json({ error: err.message });
    }
};