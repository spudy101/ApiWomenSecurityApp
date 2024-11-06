const express = require('express');
const { admin, db } = require('../../config/firebase'); // Asegúrate de tener acceso a Firestore a través de `db`
const router = express.Router();


/**
 * @swagger
 * /alertas-derivadas:
 *   get:
 *     summary: Obtiene las métricas de alertas derivadas y no derivadas.
 *     tags: [funcionario_metricas]
 *     description: Retorna el total de alertas, alertas derivadas y no derivadas.
 *     responses:
 *       200:
 *         description: Métricas de alertas obtenidas exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_alertas:
 *                   type: number
 *                   description: El total de alertas.
 *                   example: 100
 *                 total_alertas_derivadas:
 *                   type: number
 *                   description: El total de alertas derivadas.
 *                   example: 40
 *                 total_alertas_no_derivadas:
 *                   type: number
 *                   description: El total de alertas no derivadas.
 *                   example: 60
 *       500:
 *         description: Error interno al obtener las métricas.
 */
router.get('/alertas-derivadas', async (req, res) => {
  try {
    // Obtener todas las alertas
    const alertasSnapshot = await db.collection('ALERTA').get();
    
    // Si no hay alertas, retornar vacío
    if (alertasSnapshot.empty) {
      return res.status(200).json({
        total_alertas: 0,
        total_alertas_derivadas: 0,
        total_alertas_no_derivadas: 0
      });
    }

    // Obtener todas las alertas derivadas
    const alertasDerivadasSnapshot = await db.collection('ALERTA_DERIVADA').get();

    // Crear un set de ids de alertas derivadas para comparar
    const alertasDerivadasSet = new Set(alertasDerivadasSnapshot.docs.map(doc => doc.data().id_alerta));

    let total_alertas_derivadas = 0;
    let total_alertas_no_derivadas = 0;

    // Iterar sobre todas las alertas y comparar si fueron derivadas o no
    alertasSnapshot.forEach(doc => {
      const id_alerta = doc.id;
      if (alertasDerivadasSet.has(id_alerta)) {
        total_alertas_derivadas++;
      } else {
        total_alertas_no_derivadas++;
      }
    });

    // Retornar las métricas
    return res.status(200).json({
      total_alertas: alertasSnapshot.size,
      total_alertas_derivadas,
      total_alertas_no_derivadas
    });
  } catch (error) {
    console.error('Error al obtener las métricas:', error);
    return res.status(500).json({
      message: 'Error al obtener las métricas de alertas derivadas.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /usuarios-por-comuna:
 *   get:
 *     summary: Obtiene el número total de usuarios y usuarios por comuna.
 *     tags: [funcionario_metricas]
 *     description: Retorna el número total de usuarios y el número de usuarios por comuna, incluyendo el nombre de la comuna.
 *     responses:
 *       200:
 *         description: Datos obtenidos exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_usuarios:
 *                   type: number
 *                   description: El total de usuarios.
 *                   example: 100
 *                 usuarios_por_comuna:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       nombre_comuna:
 *                         type: string
 *                         description: El nombre de la comuna.
 *                         example: "Macul"
 *                       total_usuarios:
 *                         type: number
 *                         description: La cantidad de usuarios en esa comuna.
 *                         example: 10
 *       500:
 *         description: Error interno al obtener los datos.
 */
router.get('/usuarios-por-comuna', async (req, res) => {
    try {
      // 1. Obtener todos los usuarios
      const usuariosSnapshot = await db.collection('PERSONA').get();
      if (usuariosSnapshot.empty) {
        return res.status(200).json({ message: "No se encontraron usuarios" });
      }
  
      const totalUsuarios = usuariosSnapshot.size; // Número total de usuarios
  
      // 2. Crear un objeto para contar usuarios por comuna
      const usuariosPorComuna = {};
  
      // Iterar sobre los usuarios y contar por comuna
      usuariosSnapshot.forEach(doc => {
        const usuario = doc.data();
        const id_comuna = usuario.id_comuna || 'Sin Comuna'; // Asegurarse de que tenga una comuna
  
        if (usuariosPorComuna[id_comuna]) {
          usuariosPorComuna[id_comuna].total_usuarios++;
        } else {
          usuariosPorComuna[id_comuna] = { total_usuarios: 1, nombre_comuna: null }; // Inicializar con 1 usuario
        }
      });
  
      // 3. Obtener el nombre de la comuna desde la colección `COMUNA`
      const comunasSnapshot = await db.collection('COMUNA').get();
      comunasSnapshot.forEach(doc => {
        const comuna = doc.data();
        const id_comuna = comuna.id_comuna;
  
        if (usuariosPorComuna[id_comuna]) {
          usuariosPorComuna[id_comuna].nombre_comuna = comuna.nombre; // Asignar nombre de la comuna
        }
      });
  
      // 4. Convertir usuariosPorComuna en un array para mayor claridad en el retorno
      const usuariosPorComunaArray = Object.keys(usuariosPorComuna).map(id_comuna => ({
        id_comuna,
        nombre_comuna: usuariosPorComuna[id_comuna].nombre_comuna || 'Sin Comuna',
        total_usuarios: usuariosPorComuna[id_comuna].total_usuarios,
      }));
  
      // 5. Devolver los resultados
      return res.status(200).json({
        total_usuarios: totalUsuarios,
        usuarios_por_comuna: usuariosPorComunaArray,
      });
    } catch (error) {
      console.error("Error al obtener usuarios por comuna:", error);
      return res.status(500).json({
        message: "Error al obtener usuarios por comuna",
        error: error.message,
      });
    }
  });

/**
 * @swagger
 * /alertas-por-comuna:
 *   get:
 *     summary: Obtiene el número total de alertas y alertas por comuna.
 *     tags: [funcionario_metricas]
 *     description: Retorna el número total de alertas y el número de alertas por comuna, incluyendo el nombre de la comuna.
 *     responses:
 *       200:
 *         description: Datos obtenidos exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_alertas:
 *                   type: number
 *                   description: El total de alertas.
 *                   example: 100
 *                 alertas_por_comuna:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       nombre_comuna:
 *                         type: string
 *                         description: El nombre de la comuna.
 *                         example: "Macul"
 *                       total_alertas:
 *                         type: number
 *                         description: La cantidad de alertas en esa comuna.
 *                         example: 10
 *       500:
 *         description: Error interno al obtener los datos.
 */
router.get('/alertas-por-comuna', async (req, res) => {
    try {
      // 1. Obtener todas las alertas
      const alertasSnapshot = await db.collection('ALERTA').get();
      if (alertasSnapshot.empty) {
        return res.status(200).json({ message: "No se encontraron alertas" });
      }
  
      const totalAlertas = alertasSnapshot.size; // Número total de alertas
  
      // 2. Crear un objeto para contar alertas por comuna
      const alertasPorComuna = {};
  
      // Iterar sobre las alertas y contar por comuna
      alertasSnapshot.forEach(doc => {
        const alerta = doc.data();
        const comuna = alerta.comuna || 'Sin Comuna'; // Asegurarse de que tenga una comuna
  
        if (alertasPorComuna[comuna]) {
          alertasPorComuna[comuna].total_alertas++;
        } else {
          alertasPorComuna[comuna] = { total_alertas: 1, nombre_comuna: comuna }; // Inicializar con 1 alerta
        }
      });
  
      // 3. Convertir alertasPorComuna en un array para mayor claridad en el retorno
      const alertasPorComunaArray = Object.keys(alertasPorComuna).map(comuna => ({
        nombre_comuna: alertasPorComuna[comuna].nombre_comuna,
        total_alertas: alertasPorComuna[comuna].total_alertas,
      }));
  
      // 4. Devolver los resultados
      return res.status(200).json({
        total_alertas: totalAlertas,
        alertas_por_comuna: alertasPorComunaArray,
      });
    } catch (error) {
      console.error("Error al obtener alertas por comuna:", error);
      return res.status(500).json({
        message: "Error al obtener alertas por comuna",
        error: error.message,
      });
    }
  });

/**
 * @swagger
 * /alertas-derivadas-por-departamento:
 *   get:
 *     summary: Obtiene la cantidad de alertas derivadas por cada departamento.
 *     tags: [funcionario_metricas]
 *     description: Retorna un listado con los departamentos y la cantidad de alertas que han sido derivadas a cada uno.
 *     responses:
 *       200:
 *         description: Datos obtenidos exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 departamentos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_departamento:
 *                         type: string
 *                         description: El ID del departamento.
 *                         example: "RF1gx1AVP8zOG7VMZMe5"
 *                       nombre_departamento:
 *                         type: string
 *                         description: El nombre del departamento.
 *                         example: "Departamento de Seguridad"
 *                       total_alertas_derivadas:
 *                         type: number
 *                         description: La cantidad de alertas derivadas para este departamento.
 *                         example: 10
 *       500:
 *         description: Error interno al obtener los datos.
 */
router.get('/alertas-derivadas-por-departamento', async (req, res) => {
    try {
      // 1. Obtener todos los departamentos
      const departamentosSnapshot = await db.collection('DEPARTAMENTO').get();
  
      if (departamentosSnapshot.empty) {
        return res.status(200).json({
          message: "No se encontraron departamentos.",
        });
      }
  
      // 2. Para cada departamento, contar las alertas derivadas
      const departamentos = [];
  
      for (const departamentoDoc of departamentosSnapshot.docs) {
        const departamentoData = departamentoDoc.data();
        const id_departamento = departamentoDoc.id;
  
        // Contar el número de alertas derivadas para este departamento
        const alertasDerivadasSnapshot = await db.collection('ALERTA_DERIVADA')
          .where('id_departamento', '==', id_departamento)
          .get();
  
        const totalAlertasDerivadas = alertasDerivadasSnapshot.size;
  
        // Agregar el departamento con el conteo de alertas derivadas
        departamentos.push({
          id_departamento,
          nombre_departamento: departamentoData.nombre_departamento || "Nombre no disponible", // Asegúrate de tener el campo 'nombre' en cada departamento
          total_alertas_derivadas: totalAlertasDerivadas,
        });
      }
  
      // 3. Devolver la respuesta
      return res.status(200).json({
        departamentos,
      });
    } catch (error) {
      console.error("Error al obtener las alertas derivadas por departamento:", error);
      return res.status(500).json({
        message: "Error al obtener las alertas derivadas por departamento.",
        error: error.message,
      });
    }
  });

/**
 * @swagger
 * /alertas-mes-actual-por-comuna:
 *   get:
 *     summary: Obtiene el conteo de alertas del mes actual, agrupadas por comuna.
 *     tags: [funcionario_metricas]
 *     description: Retorna el conteo de todas las alertas generadas en el mes actual, agrupadas por comuna.
 *     responses:
 *       200:
 *         description: Datos obtenidos exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalAlertas:
 *                   type: number
 *                   description: Total de alertas en el mes actual.
 *                 alertasPorComuna:
 *                   type: object
 *                   additionalProperties:
 *                     type: number
 *                     description: Número de alertas en la comuna.
 *       404:
 *         description: No se encontraron alertas en el mes actual.
 *       500:
 *         description: Error interno al obtener los datos.
 */
router.get('/alertas-mes-actual-por-comuna', async (req, res) => {
    try {
      // Obtener la fecha actual
      const fechaActual = new Date();
      
      // Obtener el primer día del mes actual
      const primerDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
      
      // Obtener el primer día del próximo mes
      const primerDiaProximoMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 1);
  
      // Convertir las fechas a Timestamp de Firestore
      const primerDiaMesTimestamp = admin.firestore.Timestamp.fromDate(primerDiaMes);
      const primerDiaProximoMesTimestamp = admin.firestore.Timestamp.fromDate(primerDiaProximoMes);
  
      // Consultar las alertas dentro del rango de fechas del mes actual
      const alertasSnapshot = await db.collection('ALERTA')
        .where('fecha', '>=', primerDiaMesTimestamp)
        .where('fecha', '<', primerDiaProximoMesTimestamp)
        .get();
  
      if (alertasSnapshot.empty) {
        return res.status(200).json({
          message: "No se encontraron alertas en el mes actual.",
        });
      }
  
      // Agrupar y contar las alertas por comuna
      const alertasPorComuna = {};
      let totalAlertas = 0;
  
      alertasSnapshot.docs.forEach(doc => {
        const alerta = doc.data();
        const comuna = alerta.comuna || 'Comuna desconocida'; // Manejar si no hay comuna
  
        if (!alertasPorComuna[comuna]) {
          alertasPorComuna[comuna] = 0; // Inicializar el contador para la comuna
        }
  
        alertasPorComuna[comuna]++; // Incrementar el contador para esa comuna
        totalAlertas++; // Incrementar el total de alertas
      });
  
      // Devolver el total de alertas y el conteo por comuna
      return res.status(200).json({
        totalAlertas,
        alertasPorComuna,
      });
    } catch (error) {
      console.error("Error al obtener el conteo de alertas del mes actual:", error);
      return res.status(500).json({
        message: "Error al obtener el conteo de alertas del mes actual.",
        error: error.message,
      });
    }
  });

/**
 * @swagger
 * /alertas-por-mes:
 *   get:
 *     summary: Obtiene el conteo de alertas agrupadas por mes.
 *     tags: [funcionario_metricas]
 *     description: Retorna el conteo de todas las alertas agrupadas por mes y año.
 *     responses:
 *       200:
 *         description: Datos obtenidos exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alertasPorMes:
 *                   type: object
 *                   additionalProperties:
 *                     type: number
 *                     description: Número de alertas por mes.
 *       404:
 *         description: No se encontraron alertas.
 *       500:
 *         description: Error interno al obtener los datos.
 */
router.get('/alertas-por-mes', async (req, res) => {
    try {
        // Consultar todas las alertas
        const alertasSnapshot = await db.collection('ALERTA').get();
    
        if (alertasSnapshot.empty) {
          return res.status(200).json({
            message: "No se encontraron alertas.",
          });
        }
    
        // Agrupar y contar las alertas por año y mes
        const alertasPorMes = {};
    
        alertasSnapshot.docs.forEach(doc => {
          const alerta = doc.data();
          let fecha;
    
          // Verificar si el campo 'fecha' es un Firestore Timestamp
          if (alerta.fecha && typeof alerta.fecha.toDate === 'function') {
            fecha = alerta.fecha.toDate(); // Convertir el Timestamp de Firestore a objeto Date
          } else if (alerta.fecha && typeof alerta.fecha === 'string') {
            fecha = new Date(alerta.fecha); // Si es una cadena, convertirla a objeto Date
          } else {
            console.error("Formato de fecha no reconocido:", alerta.fecha);
            return; // Saltar esta alerta si no tiene una fecha válida
          }
    
          // Obtener el año y el mes de la alerta
          const year = fecha.getFullYear();
          const month = fecha.getMonth() + 1; // Los meses van de 0 a 11, por eso sumamos 1
    
          const key = `${year}-${month < 10 ? '0' : ''}${month}`; // Crear una clave en formato 'YYYY-MM'
    
          if (!alertasPorMes[key]) {
            alertasPorMes[key] = 0; // Inicializar el contador para ese mes
          }
    
          alertasPorMes[key]++; // Incrementar el contador para ese mes
        });
    
        // Devolver el conteo de alertas agrupadas por mes
        return res.status(200).json({
          alertasPorMes,
        });
      } catch (error) {
        console.error("Error al obtener el conteo de alertas por mes:", error);
        return res.status(500).json({
          message: "Error al obtener el conteo de alertas por mes.",
          error: error.message,
        });
      }
    });

module.exports = router;
