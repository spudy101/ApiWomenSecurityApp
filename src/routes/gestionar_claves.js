const express = require('express');
const { admin, db } = require('../config/firebase'); // Importamos db desde firebase.js
const router = express.Router();

/**
 * @swagger
 * /listar-gravedades:
 *   get:
 *     tags: [gestionar_claves]
 *     summary: Lista todas las gravedades.
 *     description: Retorna todas las gravedades disponibles en la colección "GRAVEDAD".
 *     responses:
 *       200:
 *         description: Lista de gravedades obtenida exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_gravedad:
 *                     type: string
 *                     description: ID de la gravedad.
 *                     example: "L0tZzpf0ILTVtA2gzNva"
 *                   descripcion:
 *                     type: string
 *                     description: Descripción de la gravedad.
 *                     example: "Agresión"
 *       500:
 *         description: Error al obtener las gravedades.
 */
router.get('/listar-gravedades', async (req, res) => {
  try {
    // Consulta para obtener todos los documentos en la colección GRAVEDAD
    const gravedadesSnapshot = await db.collection('GRAVEDAD').get();

    // Verificar si existen documentos
    if (gravedadesSnapshot.empty) {
      return res.status(404).json({
        message: "No se encontraron gravedades."
      });
    }

    // Crear un array para almacenar las gravedades
    const gravedades = [];
    gravedadesSnapshot.forEach(doc => {
      gravedades.push(doc.data());
    });

    // Devolver las gravedades obtenidas
    return res.status(200).json(gravedades);

  } catch (error) {
    console.error("Error al obtener las gravedades:", error);
    return res.status(500).json({
      message: "Error al obtener las gravedades.",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /obtener-claves-usuario:
 *   get:
 *     tags: [gestionar_claves]
 *     summary: Lista las claves de un usuario junto con el mensaje y la gravedad.
 *     description: Retorna todas las claves en la colección "CLAVE" relacionadas con un usuario, junto con la información del mensaje y la gravedad.
 *     parameters:
 *       - name: id_usuario
 *         in: query
 *         required: true
 *         description: El UID del usuario para obtener sus claves.
 *         schema:
 *           type: string
 *           example: "2ME9VRJaHwOvqitEOVAHATLy33e2"
 *     responses:
 *       200:
 *         description: Lista de claves obtenidas exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_clave:
 *                     type: string
 *                     description: ID de la clave.
 *                     example: "df8eVjptCStF1lc6Yabs"
 *                   palabra:
 *                     type: string
 *                     description: Palabra clave definida por el usuario.
 *                     example: "platano"
 *                   mensaje:
 *                     type: string
 *                     description: Contenido del mensaje.
 *                     example: "¡Ayuda! Juanito Perez está siendo acosado(a) y necesita asistencia inmediata."
 *                   gravedad:
 *                     type: string
 *                     description: Descripción de la gravedad.
 *                     example: "Alta"
 *       404:
 *         description: No se encontraron claves para el usuario proporcionado.
 *       500:
 *         description: Error al obtener las claves.
 */
router.get('/obtener-claves-usuario', async (req, res) => {
  const { id_usuario } = req.query;

  // Validar que se proporcione el id_usuario
  if (!id_usuario) {
    return res.status(400).json({
      message: "El parámetro 'id_usuario' es obligatorio."
    });
  }

  try {
    // Obtener las claves relacionadas con el id_usuario
    const clavesSnapshot = await db.collection('CLAVE').where('id_usuario', '==', id_usuario).get();

    // Verificar si existen documentos
    if (clavesSnapshot.empty) {
      return res.status(404).json({
        message: "No se encontraron claves para el usuario proporcionado."
      });
    }

    // Crear un array para almacenar las claves junto con los mensajes y la gravedad
    const clavesConDetalles = [];

    // Iterar sobre los documentos de la colección CLAVE
    for (const doc of clavesSnapshot.docs) {
      const claveData = doc.data();

      // Obtener el mensaje relacionado
      const mensajeDoc = await db.collection('MENSAJE').doc(claveData.id_mensaje).get();
      const mensaje = mensajeDoc.exists ? mensajeDoc.data().mensaje : 'Mensaje no encontrado';

      // Obtener la gravedad relacionada
      const gravedadDoc = await db.collection('GRAVEDAD').doc(claveData.id_gravedad).get();
      const gravedad = gravedadDoc.exists ? gravedadDoc.data().descripcion : 'Gravedad no encontrada';

      // Agregar los datos al array de resultados
      clavesConDetalles.push({
        id_clave: claveData.id_clave,
        palabra: claveData.palabra,
        mensaje: mensaje,
        gravedad: gravedad,
      });
    }

    // Devolver las claves con detalles
    return res.status(200).json(clavesConDetalles);

  } catch (error) {
    console.error("Error al obtener las claves del usuario:", error);
    return res.status(500).json({
      message: "Error al obtener las claves del usuario.",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /guardar-clave:
 *   post:
 *     tags: [gestionar_claves]
 *     summary: Guarda una nueva clave en la base de datos.
 *     description: Guarda los datos de clave enviados en Firestore bajo la colección "Clave".
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_gravedad
 *               - id_usuario
 *               - palabra
 *               - id_mensaje
 *             properties:
 *               id_gravedad:
 *                 type: string
 *                 description: ID de la gravedad asociada a la clave.
 *                 example: "L0tZzpf0ILTVtA2gzNva"
 *               id_usuario:
 *                 type: string
 *                 description: ID del usuario que está guardando la clave.
 *                 example: "ctZ64VRuHSW8bPXyPGTnCEWZbsu2"
 *               palabra:
 *                 type: string
 *                 description: Palabra clave definida por el usuario.
 *                 example: "camisa"
 *               id_mensaje:
 *                 type: string
 *                 description: ID del mensaje relacionado con la clave.
 *                 example: "mensaje_12345"
 *     responses:
 *       200:
 *         description: Clave guardada exitosamente.
 *       500:
 *         description: Error al guardar la clave.
 */
router.post('/guardar-clave', async (req, res) => {
    const { id_gravedad, id_usuario, palabra, id_mensaje } = req.body;
  
    // Validar que los campos obligatorios están presentes
    if (!id_gravedad || !id_usuario || !palabra || !id_mensaje) {
      return res.status(400).json({
        message: "Los campos 'id_gravedad', 'id_usuario', 'palabra' e 'id_mensaje' son obligatorios."
      });
    }
  
    try {
      // Generar un ID para la clave
      const nuevaClaveRef = db.collection('CLAVE').doc();
      const id_clave = nuevaClaveRef.id;
  
      // Crear el objeto con los datos
      const nuevaClave = {
        id_clave,
        id_gravedad,
        id_usuario,
        palabra,
        id_mensaje // Agregar id_mensaje al objeto que se guarda
      };
  
      // Guardar los datos en Firestore
      await nuevaClaveRef.set(nuevaClave);
  
      // Responder con éxito
      return res.status(200).json({
        message: "Clave guardada exitosamente.",
        id_clave,
      });
    } catch (error) {
      console.error("Error al guardar la clave:", error);
      return res.status(500).json({
        message: "Error al guardar la clave.",
        error: error.message,
      });
    }
});

/**
 * @swagger
 * /editar-clave:
 *   put:
 *     tags: [gestionar_claves]
 *     summary: Edita una clave existente en la base de datos.
 *     description: Permite editar los campos `id_gravedad`, `id_mensaje`, y `palabra` de una clave en Firestore.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_clave:
 *                 type: string
 *                 description: ID de la clave que se desea editar.
 *                 example: "df8eVjptCStF1lc6Yabs"
 *               id_gravedad:
 *                 type: string
 *                 description: Nuevo ID de la gravedad asociada.
 *                 example: "nuevo_id_gravedad"
 *               id_mensaje:
 *                 type: string
 *                 description: Nuevo ID del mensaje asociado.
 *                 example: "nuevo_id_mensaje"
 *               palabra:
 *                 type: string
 *                 description: Nueva palabra clave.
 *                 example: "nueva_palabra"
 *     responses:
 *       200:
 *         description: Clave actualizada exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Clave actualizada exitosamente."
 *       404:
 *         description: Clave no encontrada.
 *       500:
 *         description: Error al actualizar la clave.
 */
router.put('/editar-clave', async (req, res) => {
  const { id_gravedad, id_mensaje, palabra, id_clave } = req.body;

  try {
    // Obtener el documento de la colección CLAVE por su id_clave
    const claveRef = db.collection('CLAVE').doc(id_clave);
    const claveDoc = await claveRef.get();

    // Verificar si la clave existe
    if (!claveDoc.exists) {
      return res.status(404).json({
        message: "Clave no encontrada."
      });
    }

    // Crear un objeto con los campos que se van a actualizar
    const actualizaciones = {};
    if (id_gravedad) actualizaciones.id_gravedad = id_gravedad;
    if (id_mensaje) actualizaciones.id_mensaje = id_mensaje;
    if (palabra) actualizaciones.palabra = palabra;

    // Actualizar el documento en Firestore
    await claveRef.update(actualizaciones);

    return res.status(200).json({
      message: "Clave actualizada exitosamente.",
    });

  } catch (error) {
    console.error("Error al actualizar la clave:", error);
    return res.status(500).json({
      message: "Error al actualizar la clave.",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /eliminar-clave:
 *   delete:
 *     tags: [gestionar_claves]
 *     summary: Elimina una clave de la base de datos.
 *     description: Elimina una clave en Firestore de la colección "CLAVE" usando el `id_clave`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_clave:
 *                 type: string
 *                 description: El ID de la clave que se desea eliminar.
 *                 example: "df8eVjptCStF1lc6Yabs"
 *     responses:
 *       200:
 *         description: Clave eliminada exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Clave eliminada exitosamente."
 *       404:
 *         description: Clave no encontrada.
 *       500:
 *         description: Error al eliminar la clave.
 */
router.delete('/eliminar-clave', async (req, res) => {
  const { id_clave } = req.body;

  try {
    // Obtener referencia del documento en la colección CLAVE
    const claveRef = db.collection('CLAVE').doc(id_clave);
    const claveDoc = await claveRef.get();

    // Verificar si la clave existe
    if (!claveDoc.exists) {
      return res.status(404).json({
        message: "Clave no encontrada."
      });
    }

    // Eliminar el documento
    await claveRef.delete();

    return res.status(200).json({
      message: "Clave eliminada exitosamente."
    });

  } catch (error) {
    console.error("Error al eliminar la clave:", error);
    return res.status(500).json({
      message: "Error al eliminar la clave.",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /obtener-mensajes:
 *   get:
 *     tags: [gestionar_claves]
 *     summary: Obtiene los mensajes asociados a una persona.
 *     description: Retorna todos los mensajes en la colección "MENSAJE" relacionados con el ID de una persona.
 *     parameters:
 *       - name: id_persona
 *         in: query
 *         required: true
 *         description: El UID de la persona para obtener sus mensajes.
 *         schema:
 *           type: string
 *           example: "2ME9VRJaHwOvqitEOVAHATLy33e2"
 *     responses:
 *       200:
 *         description: Lista de mensajes obtenidos exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_mensaje:
 *                     type: string
 *                     description: ID del mensaje.
 *                     example: "gko9XCoAUSGAIDOVIafM"
 *                   id_persona:
 *                     type: string
 *                     description: ID de la persona asociada al mensaje.
 *                     example: "2ME9VRJaHwOvqitEOVAHATLy33e2"
 *                   mensaje:
 *                     type: string
 *                     description: Contenido del mensaje.
 *                     example: "¡Ayuda! Juanito Perez está siendo acosado(a) y necesita asistencia inmediata."
 *       404:
 *         description: No se encontraron mensajes para la persona proporcionada.
 *       500:
 *         description: Error al obtener los mensajes.
 */
router.get('/obtener-mensajes', async (req, res) => {
    const { id_persona } = req.query;
  
    // Validar que se proporcione el id_persona
    if (!id_persona) {
      return res.status(400).json({
        message: "El parámetro 'id_persona' es obligatorio."
      });
    }
  
    try {
      // Consulta para obtener los mensajes relacionados con el id_persona
      const mensajesSnapshot = await db.collection('MENSAJE').where('id_persona', '==', id_persona).get();
  
      // Verificar si existen documentos
      if (mensajesSnapshot.empty) {
        return res.status(404).json({
          message: "No se encontraron mensajes para la persona proporcionada."
        });
      }
  
      // Crear un array de mensajes
      const mensajes = [];
      mensajesSnapshot.forEach(doc => {
        mensajes.push(doc.data());
      });
  
      // Devolver los mensajes obtenidos
      return res.status(200).json(mensajes);
  
    } catch (error) {
      console.error("Error al obtener los mensajes:", error);
      return res.status(500).json({
        message: "Error al obtener los mensajes.",
        error: error.message,
      });
    }
});
  
/**
 * @swagger
 * /insertar-mensaje:
 *   post:
 *     tags: [gestionar_claves]
 *     summary: Inserta un nuevo mensaje en la base de datos.
 *     description: Guarda los datos de mensaje enviados en Firestore bajo la colección "MENSAJE".
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_persona
 *               - mensaje
 *             properties:
 *               id_persona:
 *                 type: string
 *                 description: ID de la persona asociada al mensaje.
 *                 example: "2ME9VRJaHwOvqitEOVAHATLy33e2"
 *               mensaje:
 *                 type: string
 *                 description: Contenido del mensaje.
 *                 example: "¡Ayuda! Juanito Pérez está siendo acosado y necesita asistencia inmediata."
 *     responses:
 *       201:
 *         description: Mensaje insertado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_mensaje:
 *                   type: string
 *                   description: ID del mensaje insertado.
 *                   example: "gko9XCoAUSGAIDOVIafM"
 *                 message:
 *                   type: string
 *                   example: "Mensaje insertado exitosamente."
 *       500:
 *         description: Error al insertar el mensaje.
 */
router.post('/insertar-mensaje', async (req, res) => {
  const { id_persona, mensaje } = req.body;

  // Validar que los campos obligatorios están presentes
  if (!id_persona || !mensaje) {
    return res.status(400).json({
      message: "Los campos 'id_persona' y 'mensaje' son obligatorios."
    });
  }

  try {
    // Generar un nuevo ID para el mensaje
    const nuevoMensajeRef = db.collection('MENSAJE').doc();
    const id_mensaje = nuevoMensajeRef.id;

    // Crear el objeto del mensaje
    const nuevoMensaje = {
      id_mensaje,
      id_persona,
      mensaje
    };

    // Guardar el mensaje en Firestore
    await nuevoMensajeRef.set(nuevoMensaje);

    // Responder con éxito
    return res.status(201).json({
      message: "Mensaje insertado exitosamente.",
      id_mensaje
    });

  } catch (error) {
    console.error("Error al insertar el mensaje:", error);
    return res.status(500).json({
      message: "Error al insertar el mensaje.",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /eliminar-mensaje:
 *   delete:
 *     tags: [gestionar_claves]
 *     summary: Elimina un mensaje de la base de datos.
 *     description: Elimina un mensaje en Firestore de la colección "MENSAJE" usando el `id_mensaje`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_mensaje:
 *                 type: string
 *                 description: El ID del mensaje que se desea eliminar.
 *                 example: "DDcUprUsaz0YuFo8VVO9"
 *     responses:
 *       200:
 *         description: Mensaje eliminado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Mensaje eliminado exitosamente."
 *       404:
 *         description: Mensaje no encontrado.
 *       500:
 *         description: Error al eliminar el mensaje.
 */
router.delete('/eliminar-mensaje', async (req, res) => {
  const { id_mensaje } = req.body;

  try {
    // Obtener referencia del documento en la colección MENSAJE
    const mensajeRef = db.collection('MENSAJE').doc(id_mensaje);
    const mensajeDoc = await mensajeRef.get();

    // Verificar si el mensaje existe
    if (!mensajeDoc.exists) {
      return res.status(404).json({
        message: "Mensaje no encontrado."
      });
    }

    // Obtener los datos del mensaje, incluido el id_persona
    const mensajeData = mensajeDoc.data();
    const { id_persona } = mensajeData;

    // Buscar otros mensajes del mismo usuario
    const otrosMensajesSnapshot = await db.collection('MENSAJE')
      .where('id_persona', '==', id_persona)
      .where(admin.firestore.FieldPath.documentId(), '!=', id_mensaje) // Filtrar mensajes que no sean el que se desea eliminar
      .get();

    // Verificar si hay otros mensajes del mismo usuario
    if (otrosMensajesSnapshot.empty) {
      return res.status(400).json({
        message: "El usuario solo tiene este mensaje, no se puede eliminar."
      });
    }

    // Si hay otros mensajes, obtener el primero para reemplazar las claves
    const mensajeDeReemplazo = otrosMensajesSnapshot.docs[0].id;

    // Obtener las claves relacionadas con el mensaje a eliminar
    const clavesSnapshot = await db.collection('CLAVE').where('id_mensaje', '==', id_mensaje).get();

    // Actualizar las claves relacionadas con el mensaje a eliminar
    const batch = db.batch(); // Usar un batch para realizar múltiples operaciones de actualización
    clavesSnapshot.forEach(claveDoc => {
      const claveRef = db.collection('CLAVE').doc(claveDoc.id);
      batch.update(claveRef, { id_mensaje: mensajeDeReemplazo }); // Redirigir las claves al nuevo mensaje del mismo usuario
    });

    // Ejecutar las actualizaciones de las claves
    await batch.commit();

    // Eliminar el mensaje original
    await mensajeRef.delete();

    return res.status(200).json({
      message: "Mensaje eliminado exitosamente y claves reasignadas a otro mensaje del usuario."
    });

  } catch (error) {
    console.error("Error al eliminar el mensaje:", error);
    return res.status(500).json({
      message: "Error al eliminar el mensaje.",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /editar-mensaje:
 *   put:
 *     tags: [gestionar_claves]
 *     summary: Edita el contenido de un mensaje existente.
 *     description: Permite editar solo el contenido del campo `mensaje` en un documento de la colección "MENSAJE". No se pueden modificar el `id_mensaje` ni el `id_persona`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_mensaje
 *               - mensaje
 *             properties:
 *               id_mensaje:
 *                 type: string
 *                 description: El ID del mensaje que se desea editar.
 *                 example: "bkBakPjGxZIBr3FKOrFb"
 *               mensaje:
 *                 type: string
 *                 description: El nuevo contenido del mensaje.
 *                 example: "Este es el nuevo contenido del mensaje."
 *     responses:
 *       200:
 *         description: Mensaje editado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Mensaje actualizado exitosamente."
 *       404:
 *         description: Mensaje no encontrado.
 *       500:
 *         description: Error al actualizar el mensaje.
 */
router.put('/editar-mensaje', async (req, res) => {
  const { id_mensaje, mensaje } = req.body;

  // Validar que se envíen los campos obligatorios
  if (!id_mensaje || !mensaje) {
    return res.status(400).json({
      message: "Los campos 'id_mensaje' y 'mensaje' son obligatorios."
    });
  }

  try {
    // Obtener referencia del mensaje en Firestore
    const mensajeRef = db.collection('MENSAJE').doc(id_mensaje);
    const mensajeDoc = await mensajeRef.get();

    // Verificar si el mensaje existe
    if (!mensajeDoc.exists) {
      return res.status(404).json({
        message: "Mensaje no encontrado."
      });
    }

    // Actualizar solo el contenido del campo `mensaje`
    await mensajeRef.update({ mensaje });

    return res.status(200).json({
      message: "Mensaje actualizado exitosamente."
    });

  } catch (error) {
    console.error("Error al actualizar el mensaje:", error);
    return res.status(500).json({
      message: "Error al actualizar el mensaje.",
      error: error.message,
    });
  }
});

module.exports = router;
