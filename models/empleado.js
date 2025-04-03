const db = require('../config/db');
const { encryptData } = require('../middlewares/encrypt');

class Empleado {
    // Método para crear un nuevo empleado
    static async crear(nombre, puesto, tipo_contrato, sueldo_base, activo, fecha_contratacion, numero_identidad, huella, fotografia) {
        const huellaEncrypt = await encryptData(huella);
        const fotografiaEncrypt = await encryptData(fotografia);

        const sql = `
            INSERT INTO empleados 
            (nombre, puesto, tipo_contrato, sueldo_base, activo, fecha_contratacion, numero_identidad, ruta_huella, ruta_fotografia) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        return db.execute(sql, [nombre, puesto, tipo_contrato, sueldo_base, activo, fecha_contratacion, numero_identidad, huellaEncrypt, fotografiaEncrypt]);
    }

    // Método para obtener todos los empleados
    static obtenerTodos() {
        const sql = `
            SELECT id, nombre, puesto, tipo_contrato, sueldo_base, activo, fecha_contratacion, numero_identidad 
            FROM empleados
        `;
        return db.execute(sql);
    }

    // Método para obtener un empleado por su ID
    static obtenerPorId(id) {
        const sql = `
            SELECT id, nombre, puesto, tipo_contrato, sueldo_base, activo, fecha_contratacion, numero_identidad 
            FROM empleados 
            WHERE id = ?
        `;
        return db.execute(sql, [id]);
    }

    // Método para actualizar un empleado
    static async actualizar(id, nombre, puesto, tipo_contrato, sueldo_base, activo, fecha_contratacion, numero_identidad, huella, fotografia) {
        let huellaEncrypt = huella ? await encryptData(huella) : null;
        let fotografiaEncrypt = fotografia ? await encryptData(fotografia) : null;

        const sql = `
            UPDATE empleados 
            SET nombre = ?, puesto = ?, tipo_contrato = ?, sueldo_base = ?, activo = ?, fecha_contratacion = ?, 
                numero_identidad = ?, ruta_huella = IFNULL(?, ruta_huella), ruta_fotografia = IFNULL(?, ruta_fotografia) 
            WHERE id = ?
        `;
        return db.execute(sql, [nombre, puesto, tipo_contrato, sueldo_base, activo, fecha_contratacion, numero_identidad, huellaEncrypt, fotografiaEncrypt, id]);
    }

    // Método para eliminar un empleado
    static eliminar(id) {
        const sql = `DELETE FROM empleados WHERE id = ?`;
        return db.execute(sql, [id]);
    }
}

module.exports = Empleado;