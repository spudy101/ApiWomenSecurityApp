const express = require('express');
const { db } = require('../../config/firebase');
const router = express.Router();

/**
 * @swagger
 * /listar-personas-perfil:
 *   get:
 *     tags: [admin_persona]
 *     summary: Obtiene la lista de todas las personas junto a sus perfiles.
 *     description: Retorna una lista de todas las personas con la información de su perfil.
 *     responses:
 *       200:
 *         description: Lista de personas y perfiles obtenida exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Personas y perfiles obtenidos exitosamente."
 *                 personas:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_persona:
 *                         type: string
 *                         example: "2ME9VRJaHwOvqitEOVAHATLy33e2"
 *                       nombre:
 *                         type: string
 *                         example: "Juanito"
 *                       apellido:
 *                         type: string
 *                         example: "Pérez"
 *                       correo:
 *                         type: string
 *                         example: "juan.perez.nuevo@example.com"
 *                       perfil:
 *                         type: object
 *                         properties:
 *                           nombre_usuario:
 *                             type: string
 *                             example: "spudy"
 *                           estado:
 *                             type: boolean
 *                             example: true
 *                           tipo_usuario:
 *                             type: string
 *                             example: "kwLQngxZFsGkG3a3k1xO"
 *       404:
 *         description: No se encontraron personas con perfil.
 *       500:
 *         description: Error interno al obtener las personas con perfil.
 */
router.get('/listar-personas-perfil', async (req, res) => {
  try {
    const personasSnapshot = await db.collection('PERSONA').get();

    if (personasSnapshot.empty) {
      return res.status(404).json({
        message: "No se encontraron personas con perfil."
      });
    }

    const personas = [];

    for (const personaDoc of personasSnapshot.docs) {
      const personaData = personaDoc.data();
      const perfilDoc = await db.collection('PERFIL').doc(personaData.id_persona).get();

      let perfilData = {};
      if (perfilDoc.exists) {
        perfilData = perfilDoc.data();
      }

      personas.push({
        id_persona: personaData.id_persona,
        nombre: personaData.nombre,
        apellido: personaData.apellido,
        correo: personaData.correo,
        perfil: perfilData
      });
    }

    return res.status(200).json({
      message: "Personas y perfiles obtenidos exitosamente.",
      personas
    });
  } catch (error) {
    console.error("Error al obtener las personas con perfil:", error);
    return res.status(500).json({
      message: "Error al obtener las personas con perfil.",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /desactivar-perfil:
 *   put:
 *     tags: [admin_persona]
 *     summary: Desactiva un perfil cambiando su estado a false.
 *     description: Desactiva un perfil de una persona mediante el ID de persona.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_persona
 *             properties:
 *               id_persona:
 *                 type: string
 *                 description: El ID de la persona cuyo perfil se desea desactivar.
 *                 example: "2ME9VRJaHwOvqitEOVAHATLy33e2"
 *     responses:
 *       200:
 *         description: Perfil desactivado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Perfil desactivado exitosamente."
 *       404:
 *         description: No se encontró el perfil.
 *       500:
 *         description: Error interno al desactivar el perfil.
 */
router.put('/desactivar-perfil', async (req, res) => {
    const { id_persona } = req.body;
  
    if (!id_persona) {
      return res.status(400).json({
        message: "El campo 'id_persona' es obligatorio."
      });
    }
  
    try {
      const perfilRef = db.collection('PERFIL').doc(id_persona);
      const perfilDoc = await perfilRef.get();
  
      if (!perfilDoc.exists) {
        return res.status(404).json({
          message: `No se encontró el perfil con el id_persona: ${id_persona}`
        });
      }
  
      // Actualizar el estado a false
      await perfilRef.update({ estado: false });
  
      return res.status(200).json({
        message: "Perfil desactivado exitosamente."
      });
    } catch (error) {
      console.error("Error al desactivar el perfil:", error);
      return res.status(500).json({
        message: "Error al desactivar el perfil.",
        error: error.message,
      });
    }
});
  
/**
 * @swagger
 * /editar-perfil:
 *   put:
 *     tags: [admin_persona]
 *     summary: Edita los datos de un perfil.
 *     description: Actualiza los campos del perfil de una persona mediante el ID de persona.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_persona
 *             properties:
 *               id_persona:
 *                 type: string
 *                 description: El ID de la persona cuyo perfil se desea editar.
 *                 example: "2ME9VRJaHwOvqitEOVAHATLy33e2"
 *               nombre_usuario:
 *                 type: string
 *                 description: El nombre de usuario.
 *                 example: "nuevo_usuario"
 *               password:
 *                 type: string
 *                 description: La contraseña del usuario.
 *                 example: "nueva_contrasena"
 *               imagen_usuario:
 *                 type: string
 *                 description: URL de la imagen de perfil del usuario.
 *                 example: "https://example.com/nueva-imagen.jpg"
 *               tipo_usuario:
 *                 type: string
 *                 description: Tipo de usuario (ID de tipo de usuario).
 *                 example: "kwLQngxZFsGkG3a3k1xO"
 *     responses:
 *       200:
 *         description: Perfil actualizado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Perfil actualizado exitosamente."
 *                 perfil_actualizado:
 *                   type: object
 *                   properties:
 *                     id_persona:
 *                       type: string
 *                       example: "2ME9VRJaHwOvqitEOVAHATLy33e2"
 *                     nombre_usuario:
 *                       type: string
 *                       example: "nuevo_usuario"
 *                     password:
 *                       type: string
 *                       example: "nueva_contrasena"
 *                     imagen_usuario:
 *                       type: string
 *                       example: "https://example.com/nueva-imagen.jpg"
 *                     tipo_usuario:
 *                       type: string
 *                       example: "kwLQngxZFsGkG3a3k1xO"
 *       404:
 *         description: No se encontró el perfil.
 *       500:
 *         description: Error interno al editar el perfil.
 */
router.put('/editar-perfil', async (req, res) => {
    const { id_persona, nombre_usuario, password, imagen_usuario, tipo_usuario } = req.body;
  
    // Verificar que el ID de la persona esté presente
    if (!id_persona) {
      return res.status(400).json({
        message: "El campo 'id_persona' es obligatorio."
      });
    }
  
    try {
      // Verificar si el perfil existe
      const perfilRef = db.collection('PERFIL').doc(id_persona);
      const perfilDoc = await perfilRef.get();
  
      if (!perfilDoc.exists) {
        return res.status(404).json({
          message: `No se encontró el perfil con el id_persona: ${id_persona}`
        });
      }
  
      // Construir el objeto de datos a actualizar
      const datosActualizados = {};
      if (nombre_usuario) datosActualizados.nombre_usuario = nombre_usuario;
      if (password) datosActualizados.password = password;
      if (imagen_usuario) datosActualizados.imagen_usuario = imagen_usuario;
      if (tipo_usuario) datosActualizados.tipo_usuario = tipo_usuario;
  
      // Actualizar el perfil en Firestore
      await perfilRef.update(datosActualizados);
  
      return res.status(200).json({
        message: "Perfil actualizado exitosamente.",
        perfil_actualizado: {
          id_persona,
          ...datosActualizados
        }
      });
    } catch (error) {
      console.error("Error al editar el perfil:", error);
      return res.status(500).json({
        message: "Error al editar el perfil.",
        error: error.message,
      });
    }
});
  
/**
 * @swagger
 * /activar-perfil:
 *   put:
 *     tags: [admin_persona]
 *     summary: Activa un perfil cambiando su estado a true.
 *     description: Activa un perfil de una persona mediante el ID de persona.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_persona
 *             properties:
 *               id_persona:
 *                 type: string
 *                 description: El ID de la persona cuyo perfil se desea activar.
 *                 example: "2ME9VRJaHwOvqitEOVAHATLy33e2"
 *     responses:
 *       200:
 *         description: Perfil activado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Perfil activado exitosamente."
 *       404:
 *         description: No se encontró el perfil.
 *       500:
 *         description: Error interno al activar el perfil.
 */
router.put('/activar-perfil', async (req, res) => {
  const { id_persona } = req.body;

  if (!id_persona) {
      return res.status(400).json({
          message: "El campo 'id_persona' es obligatorio."
      });
  }

  try {
      const perfilRef = db.collection('PERFIL').doc(id_persona);
      const perfilDoc = await perfilRef.get();

      if (!perfilDoc.exists) {
          return res.status(404).json({
              message: `No se encontró el perfil con el id_persona: ${id_persona}`
          });
      }

      // Actualizar el estado a true
      await perfilRef.update({ estado: true });

      return res.status(200).json({
          message: "Perfil activado exitosamente."
      });
  } catch (error) {
      console.error("Error al activar el perfil:", error);
      return res.status(500).json({
          message: "Error al activar el perfil.",
          error: error.message,
      });
  }
});


module.exports = router;
  