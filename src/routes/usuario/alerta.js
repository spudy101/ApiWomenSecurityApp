require('dotenv').config();
const express = require('express');
const { admin, db } = require('../../config/firebase'); // Importamos db desde firebase.js
const axios = require('axios');
const router = express.Router();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

// Clave de la API de Google Maps
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * @swagger
 * /guardar-ubicacion:
 *   post:
 *     tags: [usuario_alerta]
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
 *       500:
 *         description: Error interno al guardar la ubicación o alerta.
 */
router.post('/guardar-ubicacion', async (req, res) => {
  const { id_usuario, latitud, longitud, id_gravedad, mensaje } = req.body;

  if (!id_usuario || !latitud || !longitud || !id_gravedad || !mensaje) {
    return res.status(400).json({
      message: "Los campos 'id_usuario', 'latitud', 'longitud', 'id_gravedad' y 'mensaje' son obligatorios."
    });
  }

  try {
    // Generar un ID para la ubicación
    const nuevaUbicacionRef = db.collection('UBICACION').doc();
    const id_ubicacion = nuevaUbicacionRef.id;

    // Guardar la nueva ubicación
    const nuevaUbicacion = {
      id_ubicacion,
      id_usuario,
      latitud,
      longitud,
    };
    await nuevaUbicacionRef.set(nuevaUbicacion);

    // Obtener comuna y dirección utilizando Google Maps
    const geocodeResponse = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitud},${longitud}&key=${GOOGLE_MAPS_API_KEY}`);
    
    let comuna = '';
    let direccion = '';
    if (geocodeResponse.data.results.length > 0) {
      const addressComponents = geocodeResponse.data.results[0].address_components;
      const comunaComponent = addressComponents.find(component => component.types.includes('locality'));
      if (comunaComponent) {
        comuna = comunaComponent.long_name;
      }
      direccion = geocodeResponse.data.results[0].formatted_address;
    }

    if (!comuna) comuna = 'Comuna no disponible';
    if (!direccion) direccion = 'Dirección no disponible';

    // Guardar la alerta en Firestore
    const nuevaAlertaRef = db.collection('ALERTA').doc();
    const id_alerta = nuevaAlertaRef.id;
    
    // Construir el enlace de Google Maps con la ubicación
    const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${latitud},${longitud}`;
    
    // Incluir el enlace en el mensaje de WhatsApp
    const mensaje_nuevo = `${mensaje}. Estimados, mi ubicación actual es ${direccion} (latitud: ${latitud}, longitud: ${longitud}). Solicito asistencia urgente o notificación a las autoridades competentes. Puedes ver mi ubicación en el siguiente enlace: ${googleMapsLink}`;

    const nuevaAlerta = {
      id_alerta,
      comuna,
      direccion,
      fecha: admin.firestore.Timestamp.now(),
      id_gravedad,
      id_ubicacion,
      id_usuario,
      mensaje: mensaje_nuevo,
    };
    await nuevaAlertaRef.set(nuevaAlerta);

    // Buscar los contactos del usuario en la colección 'contactos'
    const contactosSnapshot = await db.collection('CONTACTO')
      .where('id_usuario', '==', id_usuario)
      .get();

    if (!contactosSnapshot.empty) {
      const contactos = contactosSnapshot.docs.map(doc => doc.data());

      // Enviar WhatsApp a cada contacto
      for (const contacto of contactos) {
        if (contacto.celular) {
          const mensajeWhatsApp = mensaje_nuevo;
          
          // Enviar mensaje de WhatsApp a través de Twilio
          await client.messages.create({
            from: `whatsapp:+14155238886`,
            to: `whatsapp:+56${contacto.celular}`, // Asegúrate de que el número incluya el código del país
            body: mensajeWhatsApp,
          });
          console.log(`Mensaje de WhatsApp enviado a ${contacto.celular}`);
        }
      }
    }

    return res.status(200).json({
      message: "Ubicación y alerta guardadas exitosamente. Mensajes de WhatsApp enviados a los contactos.",
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
 *     tags: [usuario_alerta]
 *     summary: Obtiene todas las alertas o una alerta específica junto con la ubicación y gravedad.
 *     parameters:
 *       - name: id_alerta
 *         in: query
 *         required: false
 *         description: ID de la alerta para buscar una alerta específica.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alerta(s) obtenida(s) exitosamente.
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
      return res.status(200).json({
        message: "No se encontraron alertas.",
        alertas: [],
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
    return res.status(200).json({ alertas: alertas });
  } catch (error) {
    console.error("Error al obtener las alertas:", error);
    return res.status(500).json({
      message: "Error al obtener las alertas.",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /guardar-contacto:
 *   post:
 *     tags: [usuario_alerta]
 *     summary: Guarda un contacto.
 *     description: Permite guardar un nuevo contacto para un usuario.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombres
 *               - apellidos
 *               - celular
 *               - email
 *               - id_usuario
 *             properties:
 *               nombres:
 *                 type: string
 *                 description: Nombres del contacto.
 *               apellidos:
 *                 type: string
 *                 description: Apellidos del contacto.
 *               celular:
 *                 type: string
 *                 description: Celular del contacto.
 *               email:
 *                 type: string
 *                 description: Email del contacto.
 *               id_usuario:
 *                 type: string
 *                 description: ID del usuario que registra el contacto.
 *     responses:
 *       201:
 *         description: Contacto agregado exitosamente.
 *       400:
 *         description: Error de validación.
 *       500:
 *         description: Error interno al agregar el contacto.
 */
router.post('/guardar-contacto', async (req, res) => {
  const { nombres, apellidos, celular, email, id_usuario } = req.body;

  if (!nombres || !apellidos || !celular || !email || !id_usuario) {
    return res.status(400).json({ message: "Todos los campos son obligatorios" });
  }

  try {
    // Referencia a la colección "CONTACTO"
    const CONTACTORef = db.collection('CONTACTO');

    // Crear un nuevo ID de contacto
    const nuevoContactoRef = CONTACTORef.doc(); 
    const id_contacto = nuevoContactoRef.id;

    // Datos del nuevo contacto
    const nuevoContacto = {
      id_contacto,    // ID generado automáticamente
      nombres,
      apellidos,
      celular,
      email,
      id_usuario,     // ID del usuario que está registrando el contacto
    };

    // Insertar el documento en Firestore
    await nuevoContactoRef.set(nuevoContacto);

    return res.status(201).json({
      message: "Contacto agregado exitosamente",
      contacto: nuevoContacto
    });
  } catch (error) {
    console.error("Error al agregar el contacto:", error);
    return res.status(500).json({ message: "Error al agregar el contacto", error });
  }
});

/**
 * @swagger
 * /editar-contacto:
 *   put:
 *     tags: [usuario_alerta]
 *     summary: Edita un contacto existente.
 *     description: Actualiza los datos de un contacto existente.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_contacto
 *               - nombres
 *               - apellidos
 *               - celular
 *               - email
 *             properties:
 *               id_contacto:
 *                 type: string
 *                 description: El ID del contacto que se va a editar.
 *               nombres:
 *                 type: string
 *               apellidos:
 *                 type: string
 *               celular:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contacto actualizado exitosamente.
 *       404:
 *         description: Contacto no encontrado.
 *       500:
 *         description: Error al actualizar el contacto.
 */
router.put('/editar-contacto', async (req, res) => {
  const { nombres, apellidos, celular, email, id_contacto } = req.body;

  if (!nombres || !apellidos || !celular || !email) {
    return res.status(400).json({ message: "Todos los campos (nombres, apellidos, celular, email) son obligatorios" });
  }

  try {
    const contactoRef = db.collection('CONTACTO').doc(id_contacto);
    const contactoDoc = await contactoRef.get();

    if (!contactoDoc.exists) {
      return res.status(200).json({ message: `No se encontró el contacto con id: ${id_contacto}` });
    }

    const datosActualizados = { nombres, apellidos, celular, email };

    await contactoRef.update(datosActualizados);

    return res.status(200).json({
      message: 'Contacto actualizado exitosamente',
      contacto: { id_contacto, ...datosActualizados }
    });
  } catch (error) {
    console.error("Error al actualizar el contacto:", error);
    return res.status(500).json({ message: "Error al actualizar el contacto", error });
  }
});

/**
 * @swagger
 * /borrar-contacto:
 *   delete:
 *     tags: [usuario_alerta]
 *     summary: Elimina un contacto.
 *     description: Elimina un contacto existente de la base de datos.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_contacto
 *             properties:
 *               id_contacto:
 *                 type: string
 *                 description: El ID del contacto que se va a eliminar.
 *     responses:
 *       200:
 *         description: Contacto eliminado exitosamente.
 *       404:
 *         description: Contacto no encontrado.
 *       500:
 *         description: Error al eliminar el contacto.
 */
router.delete('/borrar-contacto', async (req, res) => {
  const { id_contacto } = req.body;

  if (!id_contacto) {
    return res.status(400).json({ message: "El 'id_contacto' es requerido" });
  }

  try {
    const contactoRef = db.collection('CONTACTO').doc(id_contacto);
    const contactoDoc = await contactoRef.get();

    if (!contactoDoc.exists) {
      return res.status(200).json({ message: `No se encontró el contacto con id: ${id_contacto}` });
    }

    await contactoRef.delete();

    return res.status(200).json({ message: 'Contacto eliminado exitosamente' });
  } catch (error) {
    console.error("Error al eliminar el contacto:", error);
    return res.status(500).json({ message: "Error al eliminar el contacto", error });
  }
});

/**
 * @swagger
 * /ver-contactos:
 *   get:
 *     tags: [usuario_alerta]
 *     summary: Obtiene los CONTACTO de un usuario.
 *     description: Devuelve todos los CONTACTO asociados con un usuario específico.
 *     parameters:
 *       - name: id_usuario
 *         in: query
 *         required: true
 *         description: El ID del usuario.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: CONTACTO obtenidos exitosamente.
 *       404:
 *         description: No se encontraron CONTACTO para el usuario.
 *       500:
 *         description: Error al obtener los CONTACTO.
 */
router.get('/ver-contactos', async (req, res) => {
  const { id_usuario } = req.query;

  if (!id_usuario) {
    return res.status(400).json({ message: "El 'id_usuario' es requerido" });
  }

  try {
    // Filtrar los CONTACTO por id_usuario
    const CONTACTOSnapshot = await db.collection('CONTACTO')
      .where('id_usuario', '==', id_usuario)
      .get();

    if (CONTACTOSnapshot.empty) {
      return res.status(200).json({ message: `No se encontraron CONTACTO para el usuario con id: ${id_usuario}`, CONTACTO: [] });
    }

    const CONTACTO = CONTACTOSnapshot.docs.map(doc => ({
      id_contacto: doc.id,
      ...doc.data()
    }));

    return res.status(200).json({
      message: 'CONTACTO obtenidos exitosamente',
      CONTACTO: CONTACTO
    });
  } catch (error) {
    console.error("Error al obtener los CONTACTO:", error);
    return res.status(500).json({ message: "Error al obtener los CONTACTO", error });
  }
});

/**
 * @swagger
 * /alertas-usuario:
 *   get:
 *     tags: [usuario_alerta]
 *     summary: Obtiene todas las alertas de un usuario.
 *     description: Retorna todas las alertas generadas por un usuario en particular.
 *     parameters:
 *       - in: query
 *         name: id_usuario
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del usuario.
 *     responses:
 *       200:
 *         description: Lista de alertas obtenida exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Alertas obtenidas exitosamente para el usuario con id: {id_usuario}"
 *                 alertasUsuario:
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
 *                         example: "Av. Concha y Toro 2557..."
 *                       fecha:
 *                         type: string
 *                         example: "2024-09-19T04:19:02.921Z"
 *                       id_gravedad:
 *                         type: string
 *                         example: "jCF8iApdZ0s5wdgkjQ2p"
 *                       id_ubicacion:
 *                         type: string
 *                         example: "ONu4nQMcsCA18rwIQNJM"
 *                       id_usuario:
 *                         type: string
 *                         example: "2ME9VRJaHwOvqitEOVAHATLy33e2"
 *                       mensaje:
 *                         type: string
 *                         example: "Probando redirección de mensaje..."
 *       404:
 *         description: No se encontraron alertas para el usuario.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No se encontraron alertas para el usuario con id: {id_usuario}"
 *       500:
 *         description: Error interno al obtener las alertas del usuario.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error al obtener las alertas del usuario."
 *                 error:
 *                   type: string
 *                   example: "Descripción del error"
 */
router.get('/alertas-usuario', async (req, res) => {
  const { id_usuario } = req.query;

  try {
    // Consultar todas las alertas del usuario
    const alertasSnapshot = await db.collection('ALERTA')
      .where('id_usuario', '==', id_usuario) // Filtrar por el id_usuario
      .get();

    if (alertasSnapshot.empty) {
      return res.status(200).json({
        message: `No se encontraron alertas para el usuario con id: ${id_usuario}`, alertasUsuario: []
      });
    }

    // Crear una lista de alertas del usuario
    const alertasUsuario = [];
    alertasSnapshot.forEach(doc => {
      alertasUsuario.push({
        id_alerta: doc.id,
        ...doc.data(),
      });
    });

    // Devolver las alertas del usuario
    return res.status(200).json({
      message: `Alertas obtenidas exitosamente para el usuario con id: ${id_usuario}`,
      alertasUsuario
    });
  } catch (error) {
    console.error("Error al obtener las alertas del usuario:", error);
    return res.status(500).json({
      message: "Error al obtener las alertas del usuario.",
      error: error.message,
    });
  }
});

module.exports = router;
