const express = require('express');
const { admin, db } = require('../config/firebase'); // Importamos db desde firebase.js
const axios = require('axios');
const router = express.Router();

// Clave de la API de Google Maps
const GOOGLE_MAPS_API_KEY = 'AIzaSyBYwdJBx7xjiM2Vmelqa0DEfPJAeO0GI24';

/**
 * @swagger
 * tags:
 *   name: alerta
 *   description: Operaciones de generacion de alertas en el maps
*/

/**
 * @swagger
 * /guardar-ubicacion:
 *   post:
 *     tags: [alerta]
 *     summary: Guarda una ubicación y genera una alerta.
 *     description: Guarda una ubicación en la colección "UBICACION" y genera una alerta en la colección "ALERTA", obteniendo la comuna y dirección automáticamente usando la API de Google Maps.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_usuario
 *               - latitud
 *               - longitud
 *               - id_gravedad
 *               - mensaje
 *             properties:
 *               id_usuario:
 *                 type: string
 *                 description: El ID del usuario asociado con la ubicación.
 *                 example: "2ME9VRJaHwOvqitEOVAHATLy33e2"
 *               latitud:
 *                 type: number
 *                 description: Latitud de la ubicación.
 *                 example: -33.6221678
 *               longitud:
 *                 type: number
 *                 description: Longitud de la ubicación.
 *                 example: -70.6075504
 *               id_gravedad:
 *                 type: string
 *                 description: El ID de la gravedad asociada con la alerta.
 *                 example: "jCF8iApdZ0s5wdgkjQ2p"
 *               mensaje:
 *                 type: string
 *                 description: Mensaje que describe la alerta.
 *                 example: "Estoy en peligro, por favor ayúdenme."
 *     responses:
 *       200:
 *         description: Ubicación y alerta guardadas exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ubicación y alerta guardadas exitosamente."
 *                 id_ubicacion:
 *                   type: string
 *                   description: El ID de la ubicación guardada.
 *                   example: "0uitcldou0fT6sADzScd"
 *                 id_alerta:
 *                   type: string
 *                   description: El ID de la alerta generada.
 *                   example: "GRgX8V2fKcC82eaP6Aov"
 *       400:
 *         description: Error en la validación de los campos obligatorios.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Los campos 'id_usuario', 'latitud', 'longitud', 'id_gravedad' y 'mensaje' son obligatorios."
 *       500:
 *         description: Error interno al guardar la ubicación o alerta.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error al guardar la ubicación y alerta."
 *                 error:
 *                   type: string
 *                   example: "Error de conexión con Firestore."
 */
router.post('/guardar-ubicacion', async (req, res) => {
  const { id_usuario, latitud, longitud, id_gravedad, mensaje } = req.body;

  // Validar que los campos obligatorios están presentes
  if (!id_usuario || !latitud || !longitud || !id_gravedad || !mensaje) {
    return res.status(400).json({
      message: "Los campos 'id_usuario', 'latitud', 'longitud', 'id_gravedad' y 'mensaje' son obligatorios."
    });
  }

  try {
    // Generar un ID para la ubicación
    const nuevaUbicacionRef = db.collection('UBICACION').doc();
    const id_ubicacion = nuevaUbicacionRef.id;

    // Crear el objeto con los datos de ubicación
    const nuevaUbicacion = {
      id_ubicacion,
      id_usuario,
      latitud,
      longitud,
    };

    // Guardar los datos de ubicación en Firestore
    await nuevaUbicacionRef.set(nuevaUbicacion);

    // Obtener la comuna y dirección utilizando la API de Google Maps (Geocoding)
    const geocodeResponse = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitud},${longitud}&key=${GOOGLE_MAPS_API_KEY}`);

    // Extraer los datos de comuna y dirección del resultado de la geocodificación
    let comuna = '';
    let direccion = '';
    
    if (geocodeResponse.data.results.length > 0) {
      const addressComponents = geocodeResponse.data.results[0].address_components;
      
      // Buscar el componente de la comuna
      const comunaComponent = addressComponents.find(component => component.types.includes('locality'));
      if (comunaComponent) {
        comuna = comunaComponent.long_name;
      }

      // Obtener la dirección formateada
      direccion = geocodeResponse.data.results[0].formatted_address;
    }

    // Si no se obtiene comuna o dirección, manejar el caso
    if (!comuna) comuna = 'Comuna no disponible';
    if (!direccion) direccion = 'Dirección no disponible';

    // Registrar la alerta en la colección ALERTA
    const nuevaAlertaRef = db.collection('ALERTA').doc();
    const id_alerta = nuevaAlertaRef.id;

    mensaje_nuevo = `${mensaje}. Estimados, mi ubicación actual es ${direccion}, con latitud ${latitud} y longitud ${longitud}. Solicito asistencia urgente o notificación a las autoridades competentes. Gracias por su pronta atención.`;

    // Crear el objeto con los datos de alerta
    const nuevaAlerta = {
      id_alerta,
      comuna,
      direccion,
      fecha: admin.firestore.Timestamp.now(),
      id_gravedad,
      id_ubicacion, // Referencia a la ubicación creada
      id_usuario,
      mensaje: mensaje_nuevo, // Asignar el mensaje concatenado
    };

    // Guardar los datos de alerta en Firestore
    await nuevaAlertaRef.set(nuevaAlerta);

    // Responder con éxito, devolviendo ambos IDs
    return res.status(200).json({
      message: "Ubicación y alerta guardadas exitosamente.",
      id_ubicacion,
      id_alerta,
    });
  } catch (error) {
    console.error("Error al guardar la ubicación y alerta:", error);
    return res.status(500).json({
      message: "Error al guardar la ubicación y alerta.",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /obtener-alertas:
 *   get:
 *     tags: [alerta]
 *     summary: Obtiene todas las alertas o una alerta específica junto con la ubicación y gravedad.
 *     description: Devuelve todas las alertas o una alerta específica según el ID proporcionado. Incluye la información de las tablas `UBICACION` y `GRAVEDAD`.
 *     parameters:
 *       - name: id_alerta
 *         in: query
 *         required: false
 *         description: ID de la alerta para buscar una alerta específica.
 *         schema:
 *           type: string
 *           example: "1bfjj6FN8VscsUt1ND24"
 *     responses:
 *       200:
 *         description: Alerta(s) obtenida(s) exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alertas:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_alerta:
 *                         type: string
 *                         description: ID de la alerta.
 *                         example: "1bfjj6FN8VscsUt1ND24"
 *                       comuna:
 *                         type: string
 *                         description: Comuna donde se generó la alerta.
 *                         example: "Puente Alto"
 *                       direccion:
 *                         type: string
 *                         description: Dirección relacionada con la alerta.
 *                         example: "Av. Concha y Toro 2557, Puente Alto, Chile"
 *                       fecha:
 *                         type: string
 *                         description: Fecha y hora de la alerta.
 *                         example: "2024-09-19T04:19:02.921Z"
 *                       mensaje:
 *                         type: string
 *                         description: Mensaje de la alerta.
 *                         example: "¡Ayuda! Juanito Perez está en peligro."
 *                       ubicacion:
 *                         type: object
 *                         properties:
 *                           latitud:
 *                             type: number
 *                             description: Latitud de la ubicación.
 *                             example: -33.598427
 *                           longitud:
 *                             type: number
 *                             description: Longitud de la ubicación.
 *                             example: -70.578443
 *                       gravedad:
 *                         type: object
 *                         properties:
 *                           id_gravedad:
 *                             type: string
 *                             description: ID de la gravedad.
 *                             example: "jCF8iApdZ0s5wdgkjQ2p"
 *                           descripcion:
 *                             type: string
 *                             description: Descripción de la gravedad.
 *                             example: "Alta"
 *       404:
 *         description: No se encontraron alertas.
 *       500:
 *         description: Error al obtener las alertas.
 */
router.get('/obtener-alertas', async (req, res) => {
  const { id_alerta } = req.query;

  try {
    let alertasSnapshot;

    if (id_alerta) {
      // Buscar una alerta específica por id_alerta
      alertasSnapshot = await db.collection('ALERTA').where('id_alerta', '==', id_alerta).get();
    } else {
      // Obtener todas las alertas
      alertasSnapshot = await db.collection('ALERTA').get();
    }

    if (alertasSnapshot.empty) {
      return res.status(404).json({
        message: "No se encontraron alertas."
      });
    }

    const alertas = [];

    for (const alertaDoc of alertasSnapshot.docs) {
      const alertaData = alertaDoc.data();

      // Obtener los detalles de la ubicación
      const ubicacionDoc = await db.collection('UBICACION').doc(alertaData.id_ubicacion).get();
      const ubicacion = ubicacionDoc.exists ? ubicacionDoc.data() : null;

      // Obtener los detalles de la gravedad
      const gravedadDoc = await db.collection('GRAVEDAD').doc(alertaData.id_gravedad).get();
      const gravedad = gravedadDoc.exists ? gravedadDoc.data() : null;

      // Agregar la alerta con los datos de ubicación y gravedad
      alertas.push({
        id_alerta: alertaData.id_alerta,
        comuna: alertaData.comuna,
        direccion: alertaData.direccion,
        fecha: alertaData.fecha,
        mensaje: alertaData.mensaje,
        ubicacion: ubicacion ? {
          latitud: ubicacion.latitud,
          longitud: ubicacion.longitud,
        } : 'Ubicación no encontrada',
        gravedad: gravedad ? {
          id_gravedad: gravedad.id_gravedad,
          descripcion: gravedad.descripcion,
        } : 'Gravedad no encontrada',
      });
    }

    // Devolver la lista de alertas con la información de ubicación y gravedad
    return res.status(200).json({ alertas });
  } catch (error) {
    console.error("Error al obtener las alertas:", error);
    return res.status(500).json({
      message: "Error al obtener las alertas.",
      error: error.message,
    });
  }
});

module.exports = router;
