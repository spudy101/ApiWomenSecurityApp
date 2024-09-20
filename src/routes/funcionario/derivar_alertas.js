const express = require('express');
const { admin, db } = require('../../config/firebase'); // Asegúrate de tener acceso a Firestore a través de `db`
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: funcionario_derivar_alerta
 *   description: Operaciones relacionadas con las alertas
 */

/**
 * @swagger
 * /listar-alertas-hoy:
 *   get:
 *     tags: [funcionario_derivar_alerta]
 *     summary: Listar las alertas generadas hoy
 *     description: Obtiene todas las alertas que se han generado el día de hoy
 *     responses:
 *       200:
 *         description: Lista de alertas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Alertas del día de hoy obtenidas exitosamente."
 *                 alertasHoy:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_alerta:
 *                         type: string
 *                         example: "1bfjj6FN8VscsUt1ND24"
 *                       comuna:
 *                         type: string
 *                         example: "Puente Alto"
 *                       direccion:
 *                         type: string
 *                         example: "Av. Concha y Toro 2557, 8150215 Puente Alto"
 *                       fecha:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-09-19T04:19:02.921Z"
 *                       id_gravedad:
 *                         type: string
 *                         example: "jCF8iApdZ0s5wdgkjQ2p"
 *                       id_ubicacion:
 *                         type: string
 *                         example: "ONu4nQMcsCA18rwIQNJm"
 *                       id_usuario:
 *                         type: string
 *                         example: "2ME9VRJaHwOvqitEOVAHATLy33e2"
 *                       mensaje:
 *                         type: string
 *                         example: "Mensaje de alerta..."
 *       404:
 *         description: No se encontraron alertas para el día de hoy
 *       500:
 *         description: Error al obtener las alertas del día de hoy
 */
router.get('/listar-alertas-hoy', async (req, res) => {
    try {
      // Obtener la fecha actual en formato de inicio y fin del día
      const inicioDia = new Date();
      inicioDia.setHours(0, 0, 0, 0);  // Inicio del día
      const finDia = new Date();
      finDia.setHours(23, 59, 59, 999);  // Fin del día
  
      // Consultar las alertas que se generaron hoy
      const alertasSnapshot = await db.collection('ALERTA')
        .where('fecha', '>=', admin.firestore.Timestamp.fromDate(inicioDia)) // Filtrar por la fecha de inicio del día
        .where('fecha', '<=', admin.firestore.Timestamp.fromDate(finDia)) // Filtrar por la fecha de fin del día
        .get();
  
      if (alertasSnapshot.empty) {
        return res.status(404).json({
          message: "No se encontraron alertas para el día de hoy."
        });
      }
  
      // Crear listas para categorizar alertas
      const alertasDerivadas = [];
      const alertasNoDerivadas = [];
  
      // Iterar por las alertas del día
      for (const alertaDoc of alertasSnapshot.docs) {
        const alerta = {
          id_alerta: alertaDoc.id,
          ...alertaDoc.data(),
        };
  
        // Verificar si la alerta ha sido derivada
        const alertaDerivadaSnapshot = await db.collection('ALERTA_DERIVADA')
          .where('id_alerta', '==', alerta.id_alerta)
          .get();
  
        if (!alertaDerivadaSnapshot.empty) {
          // Si la alerta ha sido derivada, agregarla a la lista de derivadas
          alertasDerivadas.push(alerta);
        } else {
          // Si no ha sido derivada, agregarla a la lista de no derivadas
          alertasNoDerivadas.push(alerta);
        }
      }
  
      // Devolver la lista de alertas del día de hoy, categorizadas
      return res.status(200).json({
        message: "Alertas del día de hoy obtenidas exitosamente.",
        alertasDerivadas,
        alertasNoDerivadas
      });
    } catch (error) {
      console.error("Error al obtener las alertas del día de hoy:", error);
      return res.status(500).json({
        message: "Error al obtener las alertas del día de hoy.",
        error: error.message,
      });
    }
  });

/**
 * @swagger
 * /derivar-alerta:
 *   post:
 *     tags: [funcionario_derivar_alerta]
 *     summary: Derivar una alerta a un departamento y funcionario
 *     description: Permite derivar una alerta existente a un departamento específico y asignar un funcionario encargado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_alerta
 *               - id_departamento
 *               - id_funcionario
 *             properties:
 *               id_alerta:
 *                 type: string
 *                 description: ID de la alerta a derivar
 *                 example: "1bfjj6FN8VscsUt1ND24"
 *               id_departamento:
 *                 type: string
 *                 description: ID del departamento al que se derivará la alerta
 *                 example: "RF1gx1AVP8zOG7WZMe5"
 *               id_funcionario:
 *                 type: string
 *                 description: ID del funcionario asignado a la alerta derivada
 *                 example: "sDGtmassYHUbuMuUMGvHiyZk0Zlo1"
 *     responses:
 *       201:
 *         description: Alerta derivada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Alerta derivada exitosamente."
 *                 alertaDerivada:
 *                   type: object
 *                   properties:
 *                     id_alerta:
 *                       type: string
 *                       example: "1bfjj6FN8VscsUt1ND24"
 *                     id_alerta_derivada:
 *                       type: string
 *                       example: "WtJjIhNXg6FNYKJCH6Xk"
 *                     id_departamento:
 *                       type: string
 *                       example: "RF1gx1AVP8zOG7WZMe5"
 *                     id_funcionario:
 *                       type: string
 *                       example: "sDGtmassYHUbuMuUMGvHiyZk0Zlo1"
 *       400:
 *         description: Campos faltantes
 *       500:
 *         description: Error al derivar la alerta
 */
router.post('/derivar-alerta', async (req, res) => {
    const { id_alerta, id_departamento, id_funcionario } = req.body;
  
    if (!id_alerta || !id_departamento || !id_funcionario) {
      return res.status(400).json({
        message: "Los campos 'id_alerta', 'id_departamento' y 'id_funcionario' son obligatorios."
      });
    }
  
    try {
      const alertaRef = db.collection('ALERTA').doc(id_alerta);
      const alertaDoc = await alertaRef.get();
  
      if (!alertaDoc.exists) {
        return res.status(404).json({
          message: `No se encontró la alerta con el id: ${id_alerta}`
        });
      }
  
      const nuevaAlertaDerivadaRef = db.collection('ALERTA_DERIVADA').doc();
      const id_alerta_derivada = nuevaAlertaDerivadaRef.id;
  
      const nuevaAlertaDerivada = {
        id_alerta,
        id_alerta_derivada,
        id_departamento,
        id_funcionario,
      };
  
      await nuevaAlertaDerivadaRef.set(nuevaAlertaDerivada);
  
      return res.status(201).json({
        message: "Alerta derivada exitosamente.",
        alertaDerivada: nuevaAlertaDerivada
      });
    } catch (error) {
      console.error("Error al derivar la alerta:", error);
      return res.status(500).json({
        message: "Error al derivar la alerta.",
        error: error.message,
      });
    }
  });

module.exports = router;
