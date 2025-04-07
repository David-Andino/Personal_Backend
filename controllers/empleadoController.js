const db = require('../config/db');
const cloudinary = require('cloudinary').v2;

// Configuración adicional de Cloudinary (opcional)
cloudinary.config({
  secure: true // Fuerza HTTPS
});

// Función para eliminar imagen anterior si existe
const eliminarImagenAnterior = async (publicId) => {
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Error al eliminar imagen anterior:', error);
    }
  }
};

// Crear un nuevo empleado
exports.crearEmpleado = async (req, res) => {
    try {
        const {
            nombre,
            puesto,
            tipo_contrato,
            sueldo_base,
            activo,
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

        // Validaciones (se mantienen iguales)
        if (!nombre || !puesto || !tipo_contrato || !sueldo_base || !fecha_contratacion || !numero_identidad || !telefono || !domicilio || !estado_civil || !sexo || !nivel_educativo || !nombre_emergencia || !telefono_emergencia || !lugar_nacimiento || !fecha_nacimiento || !tipo_contrato_empleo || !nacionalidad) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        if (activo !== 'SI' && activo !== 'NO') {
            return res.status(400).json({ error: 'El campo activo debe ser "SI" o "NO"' });
        }

        const fechaEgresoValue = fecha_egreso === 'null' || !fecha_egreso ? null : fecha_egreso;

        // Obtener URL segura de Cloudinary (si se subió imagen)
        const imagenCloudinary = req.file ? {
            url: req.file.path,
            public_id: req.file.filename
        } : null;

        // Ejecutar la consulta SQL
        const [result] = await db.query(
            `INSERT INTO empleados 
            (nombre, puesto, tipo_contrato, sueldo_base, activo, fecha_contratacion, numero_identidad, 
             ruta_huella, ruta_fotografia, public_id_foto, telefono, domicilio, estado_civil, sexo, 
             fecha_egreso, nivel_educativo, nombre_emergencia, telefono_emergencia, lugar_nacimiento, 
             fecha_nacimiento, tipo_contrato_empleo, beneficiarios, nacionalidad) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nombre,
                puesto,
                tipo_contrato,
                sueldo_base,
                activo,
                fecha_contratacion,
                numero_identidad,
                huella || null,
                imagenCloudinary?.url || null,
                imagenCloudinary?.public_id || null,
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

        if (!result?.insertId) {
            throw new Error('No se pudo crear el empleado');
        }

        res.status(201).json({ 
            message: 'Empleado creado exitosamente', 
            id: result.insertId,
            imagen: imagenCloudinary?.url || null
        });

    } catch (err) {
        // Si hay error, eliminar imagen subida a Cloudinary
        if (req.file?.filename) {
            await eliminarImagenAnterior(req.file.filename);
        }

        console.error('Error al crear empleado:', {
            message: err.message,
            body: req.body
        });
        
        if (err.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
            return res.status(400).json({ error: 'Valor inválido para el campo activo' });
        }
        
        res.status(500).json({ 
            error: 'Error al crear el empleado', 
            details: process.env.NODE_ENV === 'development' ? err.message : null
        });
    }
};

// Obtener todos los empleados (sin cambios)
exports.obtenerEmpleados = async (req, res) => {
    try {
        const [empleados] = await db.query(`
            SELECT id, nombre, puesto, tipo_contrato, sueldo_base, activo, 
                   fecha_contratacion, ruta_fotografia as foto, telefono
            FROM empleados
        `);
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
        const [empleado] = await db.query(`
            SELECT *, ruta_fotografia as foto 
            FROM empleados 
            WHERE id = ?
        `, [id]);

        if (!empleado.length) {
            return res.status(404).json({ message: 'Empleado no encontrado' });
        }

        res.json(empleado[0]);
    } catch (err) {
        console.error('Error al obtener empleado:', err);
        res.status(500).json({ error: err.message });
    }
};

// Actualizar un empleado
exports.actualizarEmpleado = async (req, res) => {
    let transaction;
    try {
        const { id } = req.params;
        const campos = req.body;

        // Validaciones básicas
        if (!campos.nombre || !campos.puesto || !campos.tipo_contrato || 
            !campos.sueldo_base || !campos.fecha_contratacion || !campos.numero_identidad) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        if (campos.activo && campos.activo !== 'SI' && campos.activo !== 'NO') {
            return res.status(400).json({ error: 'Campo activo inválido' });
        }

        // Obtener empleado actual para manejo de imagen
        const [empleadoActual] = await db.query(
            'SELECT public_id_foto FROM empleados WHERE id = ?', 
            [id]
        );

        if (!empleadoActual.length) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }

        const publicIdAnterior = empleadoActual[0].public_id_foto;
        const nuevaImagen = req.file ? {
            url: req.file.path,
            public_id: req.file.filename
        } : null;

        // Actualizar datos
        const [result] = await db.query(
            `UPDATE empleados 
            SET nombre = ?, puesto = ?, tipo_contrato = ?, sueldo_base = ?, 
                activo = COALESCE(?, activo), fecha_contratacion = ?, 
                numero_identidad = ?, ruta_huella = IFNULL(?, ruta_huella), 
                ruta_fotografia = IFNULL(?, ruta_fotografia), 
                public_id_foto = IFNULL(?, public_id_foto),
                telefono = ?, domicilio = ?, estado_civil = ?, sexo = ?, 
                fecha_egreso = ?, nivel_educativo = ?, nombre_emergencia = ?, 
                telefono_emergencia = ?, lugar_nacimiento = ?, fecha_nacimiento = ?, 
                tipo_contrato_empleo = ?, beneficiarios = ?, nacionalidad = ?
            WHERE id = ?`,
            [
                campos.nombre,
                campos.puesto,
                campos.tipo_contrato,
                campos.sueldo_base,
                campos.activo,
                campos.fecha_contratacion,
                campos.numero_identidad,
                campos.huella,
                nuevaImagen?.url,
                nuevaImagen?.public_id,
                campos.telefono,
                campos.domicilio,
                campos.estado_civil,
                campos.sexo,
                campos.fecha_egreso === 'null' ? null : campos.fecha_egreso,
                campos.nivel_educativo,
                campos.nombre_emergencia,
                campos.telefono_emergencia,
                campos.lugar_nacimiento,
                campos.fecha_nacimiento,
                campos.tipo_contrato_empleo,
                campos.beneficiarios,
                campos.nacionalidad,
                id
            ]
        );

        if (result.affectedRows === 0) {
            throw new Error('No se actualizó ningún registro');
        }

        // Eliminar imagen anterior si se subió una nueva
        if (nuevaImagen && publicIdAnterior) {
            await eliminarImagenAnterior(publicIdAnterior);
        }

        res.json({ 
            success: true,
            message: 'Empleado actualizado',
            foto: nuevaImagen?.url || null
        });

    } catch (err) {
        // Si falló, eliminar la nueva imagen subida
        if (req.file?.filename) {
            await eliminarImagenAnterior(req.file.filename);
        }

        console.error('Error al actualizar empleado:', err);
        
        if (err.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
            return res.status(400).json({ error: 'Valor inválido para campo activo' });
        }

        res.status(500).json({ 
            error: 'Error al actualizar empleado',
            details: process.env.NODE_ENV === 'development' ? err.message : null
        });
    }
};

// Eliminar un empleado
exports.eliminarEmpleado = async (req, res) => {
    try {
        const { id } = req.params;

        // Primero obtener datos para eliminar la imagen
        const [empleado] = await db.query(
            'SELECT public_id_foto FROM empleados WHERE id = ?', 
            [id]
        );

        if (!empleado.length) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }

        // Eliminar registro de la base de datos
        const [result] = await db.query(
            'DELETE FROM empleados WHERE id = ?', 
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'No se eliminó ningún registro' });
        }

        // Eliminar imagen de Cloudinary si existe
        if (empleado[0].public_id_foto) {
            await eliminarImagenAnterior(empleado[0].public_id_foto);
        }

        res.json({ 
            success: true,
            message: 'Empleado eliminado correctamente'
        });

    } catch (err) {
        console.error('Error al eliminar empleado:', err);
        res.status(500).json({ 
            error: 'Error al eliminar empleado',
            details: process.env.NODE_ENV === 'development' ? err.message : null
        });
    }
};