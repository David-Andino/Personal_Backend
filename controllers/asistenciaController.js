const Asistencia = require('../models/asistencia');
const db = require('../config/db');

exports.registrarAsistencia = async (req, res) => {
  try {
    const asistenciaId = await Asistencia.crear(req.body);
    res.status(201).json({ id: asistenciaId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.actualizarAsistencia = async (req, res) => {
  try {
    const actualizado = await Asistencia.actualizar(req.params.id, req.body);
    if (actualizado) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Asistencia no encontrada' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.obtenerAsistencia = async (req, res) => {
  try {
    const asistencia = await Asistencia.obtenerPorId(req.params.id);
    if (asistencia) {
      res.json(asistencia);
    } else {
      res.status(404).json({ error: 'Asistencia no encontrada' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.obtenerAsistenciasPorFecha = async (req, res) => {
  try {
    const asistencias = await Asistencia.obtenerPorFecha(req.params.fecha);
    res.json(asistencias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.obtenerResumenDiario = async (req, res) => {
  try {
    const { fecha } = req.query;
    
    if (!fecha) {
      return res.status(400).json({ error: 'Fecha es requerida' });
    }
    
    if (!isValidDate(fecha)) {
      return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' });
    }
    
    const resumen = await Asistencia.obtenerResumenDiario(fecha);
    res.json(resumen);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

function isValidDate(dateString) {
  const regEx = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateString.match(regEx)) return false;
  const d = new Date(dateString);
  return !isNaN(d.getTime());
}

exports.obtenerAsistenciasPorEmpleado = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    const asistencias = await Asistencia.obtenerPorEmpleado(
      req.params.empleadoId, 
      fechaInicio || '1900-01-01', 
      fechaFin || new Date().toISOString().split('T')[0]
    );
    res.json(asistencias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.registrarEntradaSalida = async (req, res) => {
  try {
    const { numeroIdentidad, tipo, hora, fecha, esManual } = req.body;
    
    if (!numeroIdentidad) {
      return res.status(400).json({ error: 'Número de identidad es requerido' });
    }
    
    if (!fecha) {
      return res.status(400).json({ error: 'Fecha es requerida' });
    }
    
    if (!hora) {
      return res.status(400).json({ error: 'Hora es requerida' });
    }

    const resultado = await Asistencia.registrarEntrada(
      numeroIdentidad, 
      tipo, 
      hora, 
      fecha, 
      esManual
    );
    
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.cerrarJornada = async (req, res) => {
  try {
    const { fecha, horaCierre } = req.body;
    const cerrados = await Asistencia.cerrarJornada(fecha, horaCierre);
    res.json({ 
      success: true,
      registrosActualizados: cerrados
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.obtenerRegistrosSinSalida = async (req, res) => {
  try {
    const registros = await Asistencia.obtenerRegistrosSinSalida(req.params.fecha);
    res.json(registros);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};