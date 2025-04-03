const db = require('../config/db');

class Asistencia {
  static async crear(asistencia) {
    const { empleado_id, fecha, hora_entrada, hora_salida, permiso } = asistencia;
    const [result] = await db.query(
      'INSERT INTO asistencias (empleado_id, fecha, hora_entrada, hora_salida, permiso) VALUES (?, ?, ?, ?, ?)',
      [empleado_id, fecha, hora_entrada, hora_salida, permiso]
    );
    return result.insertId;
  }

  static async actualizar(id, datosActualizados) {
    const campos = [];
    const valores = [];
    
    for (const [key, value] of Object.entries(datosActualizados)) {
      campos.push(`${key} = ?`);
      valores.push(value);
    }
    
    valores.push(id);
    
    const [result] = await db.query(
      `UPDATE asistencias SET ${campos.join(', ')} WHERE id = ?`,
      valores
    );
    
    return result.affectedRows > 0;
  }

  static async obtenerPorId(id) {
    const [rows] = await db.query(
      'SELECT a.*, e.nombre as empleado_nombre FROM asistencias a JOIN empleados e ON a.empleado_id = e.id WHERE a.id = ?',
      [id]
    );
    return rows[0];
  }

  static async cerrarJornada(fecha, horaCierre) {
    const [result] = await db.query(
      `UPDATE asistencias 
       SET hora_salida = ?
       WHERE fecha = ? AND hora_salida IS NULL`,
      [horaCierre, fecha]
    );
    return result.affectedRows;
  }
  
  static async obtenerRegistrosSinSalida(fecha) {
    const [rows] = await db.query(
      `SELECT e.numero_identidad, e.nombre, a.hora_entrada
       FROM asistencias a
       JOIN empleados e ON a.empleado_id = e.id
       WHERE a.fecha = ? AND a.hora_salida IS NULL`,
      [fecha]
    );
    return rows;
  }

  static async obtenerPorFecha(fecha) {
    const [rows] = await db.query(
      `SELECT a.*, e.nombre as empleado_nombre, e.puesto 
       FROM asistencias a 
       JOIN empleados e ON a.empleado_id = e.id 
       WHERE a.fecha = ? 
       ORDER BY e.nombre`,
      [fecha]
    );
    return rows;
  }

  static async obtenerResumenDiario(fecha) {
    // 1. Obtener total de empleados activos
    const [totalEmpleados] = await db.query(
      `SELECT COUNT(*) as total 
       FROM empleados 
       WHERE activo = 'SI'`
    );
    const total = totalEmpleados[0].total || 0;

    // 2. Obtener empleados con registro de entrada
    const [asistencias] = await db.query(
      `SELECT COUNT(DISTINCT empleado_id) as asistieron
       FROM asistencias
       WHERE fecha = ?
       AND hora_entrada IS NOT NULL`,
      [fecha]
    );
    const asistieron = asistencias[0].asistieron || 0;

    const [activos] = await db.query(
      `SELECT COUNT(DISTINCT empleado_id) as activos
       FROM asistencias
       WHERE fecha = ?
       AND hora_entrada IS NOT NULL
       AND hora_salida IS NULL`,
      [fecha]
    );
    const activos1 = activos[0].activos || 0;

    // 3. Calcular faltas (total - asistieron)
    const faltaron = total - asistieron;

    // 4. Calcular porcentajes
    const porcentajeAsistencia = total > 0 ? Math.round((asistieron / total) * 100) : 0;
    const porcentajeFaltas = 100 - porcentajeAsistencia;

    return [{
      fecha: fecha,
      total_empleados: total,
      asistieron: asistieron,
      faltaron: faltaron,
      porcentaje_asistencia: porcentajeAsistencia,
      porcentaje_faltas: porcentajeFaltas,
      con_permiso: 0, // A implementar
      empleados_activos: activos1
    }];
  }

  static async obtenerPorEmpleado(numeroIdentidad, fechaInicio, fechaFin) {
    const [empleado] = await db.query(
      'SELECT id FROM empleados WHERE numero_identidad = ?',
      [numeroIdentidad]
    );
    
    if (!empleado.length) {
      throw new Error('Empleado no encontrado');
    }
  
    const [rows] = await db.query(
      `SELECT a.*, e.nombre as empleado_nombre 
       FROM asistencias a 
       JOIN empleados e ON a.empleado_id = e.id 
       WHERE a.empleado_id = ? AND a.fecha BETWEEN ? AND ?
       ORDER BY a.fecha DESC`,
      [empleado[0].id, fechaInicio, fechaFin]
    );
    return rows;
  }

  static async registrarEntrada(numeroIdentidad, tipo, hora, fecha, esManual) {
    // 1. Buscar el empleado por número de identidad
    const [empleado] = await db.query(
      'SELECT id FROM empleados WHERE numero_identidad = ?',
      [numeroIdentidad]
    );
    
    if (!empleado.length) {
      throw new Error('Empleado no encontrado con este número de identidad');
    }
    
    const empleadoId = empleado[0].id;
  
    if (tipo === 'entrada') {
      // Verificar si ya existe registro hoy
      const [existente] = await db.query(
        'SELECT id FROM asistencias WHERE empleado_id = ? AND fecha = ?',
        [empleadoId, fecha]
      );
      
      if (existente.length > 0) {
        return { accion: 'ya_registrado' };
      } else {
        // Crear nuevo registro
        await db.query(
          'INSERT INTO asistencias (empleado_id, fecha, hora_entrada, entrada_manual) VALUES (?, ?, ?, ?)',
          [empleadoId, fecha, hora, esManual]
        );
        return { accion: 'entrada' };
      }
    } else if (tipo === 'salida') {
      // Actualizar registro existente
      const [result] = await db.query(
        'UPDATE asistencias SET hora_salida = ?, salida_manual = ? WHERE empleado_id = ? AND fecha = ? AND hora_salida IS NULL',
        [hora, esManual, empleadoId, fecha]
      );
      
      if (result.affectedRows > 0) {
        return { accion: 'salida' };
      } else {
        return { accion: 'no_registro' };
      }
    }
  }
}

module.exports = Asistencia;