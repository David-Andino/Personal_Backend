const db = require('../config/db');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  secure: true 
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
                   fecha_contratacion, numero_identidad
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


exports.actualizarEmpleado = async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Validación básica de ID
        if (!id || isNaN(id)) {
            return res.status(400).json({ 
                success: false,
                error: 'ID de empleado no válido' 
            });
        }

        // 2. Validar campos obligatorios
        const camposObligatorios = ['nombre', 'puesto', 'tipo_contrato', 'sueldo_base', 'activo'];
        const faltantes = camposObligatorios.filter(campo => !req.body[campo]);
        
        if (faltantes.length > 0) {
            return res.status(400).json({ 
                success: false,
                error: `Faltan campos obligatorios: ${faltantes.join(', ')}`,
                receivedData: req.body // Para depuración
            });
        }

        // 3. Procesamiento de datos
        const procesarValor = (valor) => {
            if (valor === 'null' || valor === '' || valor === 'undefined') return null;
            return valor;
        };

        // 4. Obtener empleado actual
        const [empleadoActual] = await db.query(
            'SELECT public_id_foto FROM empleados WHERE id = ?', 
            [id]
        );

        if (!empleadoActual.length) {
            return res.status(404).json({ 
                success: false,
                error: 'Empleado no encontrado' 
            });
        }

        // 5. Procesamiento de imagen
        let imagenCloudinary = null;
        if (req.file) {
            try {
                // Eliminar imagen anterior si existe
                if (empleadoActual[0].public_id_foto) {
                    await eliminarImagenAnterior(empleadoActual[0].public_id_foto);
                }
                
                imagenCloudinary = {
                    url: req.file.path,
                    public_id: req.file.filename
                };
            } catch (error) {
                console.error('Error procesando imagen:', error);
                return res.status(500).json({
                    success: false,
                    error: 'Error al procesar la imagen'
                });
            }
        }

        // 6. Construir consulta dinámica
        const camposActualizar = {
            nombre: req.body.nombre,
            puesto: req.body.puesto,
            tipo_contrato: req.body.tipo_contrato,
            sueldo_base: req.body.sueldo_base,
            activo: req.body.activo,
            fecha_contratacion: req.body.fecha_contratacion,
            numero_identidad: req.body.numero_identidad,
            telefono: req.body.telefono,
            domicilio: req.body.domicilio,
            estado_civil: req.body.estado_civil,
            sexo: req.body.sexo,
            fecha_egreso: procesarValor(req.body.fecha_egreso),
            nivel_educativo: req.body.nivel_educativo,
            nombre_emergencia: req.body.nombre_emergencia,
            telefono_emergencia: req.body.telefono_emergencia,
            lugar_nacimiento: req.body.lugar_nacimiento,
            fecha_nacimiento: req.body.fecha_nacimiento,
            tipo_contrato_empleo: req.body.tipo_contrato_empleo,
            beneficiarios: procesarValor(req.body.beneficiarios),
            nacionalidad: req.body.nacionalidad
        };

        if (imagenCloudinary) {
            camposActualizar.ruta_fotografia = imagenCloudinary.url;
            camposActualizar.public_id_foto = imagenCloudinary.public_id;
        }

        // 7. Construir consulta SQL dinámica
        let setClause = [];
        let params = [];
        
        Object.entries(camposActualizar).forEach(([key, value]) => {
            if (value !== undefined) {
                setClause.push(`${key} = ?`);
                params.push(value);
            }
        });

        params.push(id);

        const query = `UPDATE empleados SET ${setClause.join(', ')} WHERE id = ?`;
        
        // 8. Ejecutar consulta
        const [result] = await db.query(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'No se actualizó ningún registro' 
            });
        }

        // 9. Obtener datos actualizados
        const [empleadoActualizado] = await db.query(
            'SELECT * FROM empleados WHERE id = ?', 
            [id]
        );

        res.json({ 
            success: true,
            message: 'Empleado actualizado correctamente',
            data: empleadoActualizado[0]
        });

    } catch (err) {
        // Eliminar imagen si hubo error
        if (req.file?.filename) {
            await eliminarImagenAnterior(req.file.filename);
        }

        console.error('Error detallado:', {
            message: err.message,
            stack: err.stack,
            body: req.body,
            params: req.params,
            file: req.file
        });
        
        res.status(500).json({ 
            success: false,
            error: 'Error interno al actualizar empleado',
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