const express = require('express');
const { admin, db } = require('../../config/firebase'); // Importamos db desde firebase.js
const router = express.Router();

/**
 * @swagger
 * /listar-ubicacion-actual:
 *   get:
 *     tags: [ubicacion]
 *     summary: Obtiene la ubicación actual de los miembros de los grupos de un usuario, con filtros opcionales.
 *     description: Devuelve la ubicación actual de los miembros de los grupos a los que pertenece el `id_persona` especificado. Se pueden aplicar filtros opcionales para obtener la ubicación de un grupo específico o de un usuario específico.
 *     parameters:
 *       - in: query
 *         name: id_persona
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del usuario que realiza la solicitud y cuyos grupos se revisarán.
 *       - in: query
 *         name: id_grupo
 *         schema:
 *           type: string
 *         required: false
 *         description: ID del grupo específico para limitar los resultados a los miembros de ese grupo.
 *       - in: query
 *         name: id_persona_buscar
 *         schema:
 *           type: string
 *         required: false
 *         description: ID de una persona específica para obtener solo su ubicación actual.
 *     responses:
 *       200:
 *         description: Miembros obtenidos exitosamente con sus ubicaciones actuales.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Miembros únicos de todos los grupos obtenidos exitosamente."
 *                 miembros:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_usuario:
 *                         type: string
 *                         example: "KpUMbpgXPrPuQW3yBBiYcAWrbUn2"
 *                       persona:
 *                         type: object
 *                         properties:
 *                           nombre:
 *                             type: string
 *                             example: "Juanito"
 *                           apellido:
 *                             type: string
 *                             example: "Pérez"
 *                           correo:
 *                             type: string
 *                             example: "juanito@example.com"
 *                           numero_telefono:
 *                             type: string
 *                             example: "+56912345678"
 *                       perfil:
 *                         type: object
 *                         properties:
 *                           correo:
 *                             type: string
 *                             example: "juanito@example.com"
 *                           tipo_usuario:
 *                             type: string
 *                             example: "Usuario"
 *                           imagen:
 *                             type: string
 *                             example: "imagen_url"
 *                       ubicacion:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id_ubicacion_actual:
 *                             type: string
 *                             example: "UbicacionID"
 *                           latitud:
 *                             type: string
 *                             example: "-33.4567"
 *                           longitud:
 *                             type: string
 *                             example: "-70.6483"
 *                           timestamp:
 *                             type: string
 *                             example: "2024-11-06T00:58:08Z"
 *       400:
 *         description: Falta el parámetro obligatorio id_persona.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "El parámetro 'id_persona' es obligatorio."
 *       500:
 *         description: Error en el servidor al obtener los datos.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error al obtener los miembros únicos de todos los grupos"
 *                 error:
 *                   type: string
 *                   example: "Error detallado del servidor."
 */
router.get('/listar-ubicacion-actual', async (req, res) => {
    const { id_persona, id_grupo, id_persona_buscar } = req.query;
  
    if (!id_persona) {
      return res.status(400).json({ message: "El parámetro 'id_persona' es obligatorio." });
    }
  
    try {
      let idUsuarios = [];
  
      // Si `id_persona_buscar` está presente, limitamos los resultados a esta persona específica
      if (id_persona_buscar) {
        idUsuarios = [id_persona_buscar];
      } else if (id_grupo) {
        // Si `id_grupo` está presente (y `id_persona_buscar` no está), obtenemos los miembros del grupo específico
        const grupoPersonaSnapshot = await db.collection('GRUPO_PERSONA')
          .where('id_grupo', '==', id_grupo)
          .get();
  
        if (grupoPersonaSnapshot.empty) {
          return res.status(200).json({
            message: `El grupo con id ${id_grupo} no tiene miembros.`,
            miembros: []
          });
        }
  
        idUsuarios = grupoPersonaSnapshot.docs.map(doc => doc.data().id_usuario);
      } else {
        // Si no se especifica `id_grupo` ni `id_persona_buscar`, obtenemos todos los miembros de todos los grupos a los que pertenece `id_persona`
        const gruposSnapshot = await db.collection('GRUPO_PERSONA')
          .where('id_usuario', '==', id_persona)
          .get();
  
        if (gruposSnapshot.empty) {
          return res.status(200).json({
            message: `El usuario con id ${id_persona} no pertenece a ningún grupo.`,
            miembros: []
          });
        }
  
        // Obtener todos los id_grupo de los grupos a los que pertenece el usuario
        const idGrupos = gruposSnapshot.docs.map(doc => doc.data().id_grupo);
  
        // Usar un Set para recolectar id_usuario únicos de los miembros de esos grupos
        const miembrosSet = new Set();
        for (const idGrupo of idGrupos) {
          const grupoPersonaSnapshot = await db.collection('GRUPO_PERSONA')
            .where('id_grupo', '==', idGrupo)
            .get();
  
          grupoPersonaSnapshot.forEach(doc => {
            miembrosSet.add(doc.data().id_usuario);
          });
        }
  
        // Convertir el Set de miembros a un Array
        idUsuarios = [...miembrosSet];
      }
  
      // Obtener las ubicaciones de cada miembro de manera individual
      const ubicacionesMap = {};
      for (const idUsuario of idUsuarios) {
        const ubicacionSnapshot = await db.collection('UBICACION_ACTUAL')
          .where('id_usuario', '==', idUsuario)
          .limit(1)
          .get();
  
        if (!ubicacionSnapshot.empty) {
          ubicacionesMap[idUsuario] = ubicacionSnapshot.docs[0].data();
        }
      }
  
      // Obtener los datos de cada miembro y combinar con su ubicación
      const miembros = await Promise.all(idUsuarios.map(async (idUsuario) => {
        const personaRef = db.collection('PERSONA').doc(idUsuario);
        const personaDoc = await personaRef.get();
  
        if (!personaDoc.exists) return null; // Omitir si no existe la persona
  
        const perfilRef = db.collection('PERFIL').doc(idUsuario);
        const perfilDoc = await perfilRef.get();
  
        // Extraer solo los campos necesarios de persona y perfil
        const personaData = personaDoc.data();
        const perfilData = perfilDoc.exists ? perfilDoc.data() : {};
  
        const persona = {
          nombre: personaData.nombre,
          apellido: personaData.apellido,
          correo: personaData.correo,
          numero_telefono: personaData.numero_telefono,
        };
  
        const perfil = {
          correo: perfilData.correo,
          tipo_usuario: perfilData.tipo_usuario,
          imagen: perfilData.imagen_usuario,
        };
  
        // Obtener la ubicación desde el mapa de ubicaciones
        const ubicacion = ubicacionesMap[idUsuario] || null;
  
        return {
          id_usuario: idUsuario,
          persona,
          perfil,
          ubicacion: ubicacion
        };
      }));
  
      // Filtrar miembros nulos
      const miembrosFiltrados = miembros.filter(m => m !== null);
  
      return res.status(200).json({
        message: 'Miembros únicos de todos los grupos obtenidos exitosamente.',
        miembros: miembrosFiltrados
      });
    } catch (error) {
      console.error('Error al obtener los miembros únicos de todos los grupos:', error);
      return res.status(500).json({
        message: 'Error al obtener los miembros únicos de todos los grupos',
        error: error.message
      });
    }
  });
  
  
/**
 * @swagger
 * /actualizar-ubicacion:
 *   post:
 *     tags: [ubicacion_actual]
 *     summary: Actualiza la ubicación actual de un usuario.
 *     description: Recibe el `id_usuario`, `latitud`, y `longitud` para crear o actualizar el documento de ubicación en la colección "UBICACION_ACTUAL".
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
 *             properties:
 *               id_usuario:
 *                 type: string
 *                 description: El ID del usuario cuya ubicación se va a actualizar.
 *                 example: "KpUMbpgXPrPuQW3yBBiYcAWrbUn2"
 *               latitud:
 *                 type: string
 *                 description: Latitud de la ubicación actual.
 *                 example: "-33.4489"
 *               longitud:
 *                 type: string
 *                 description: Longitud de la ubicación actual.
 *                 example: "-70.6693"
 *     responses:
 *       200:
 *         description: Ubicación actualizada exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ubicación actualizada exitosamente."
 *                 id_usuario:
 *                   type: string
 *                   example: "KpUMbpgXPrPuQW3yBBiYcAWrbUn2"
 *                 latitud:
 *                   type: string
 *                   example: "-33.4489"
 *                 longitud:
 *                   type: string
 *                   example: "-70.6693"
 *       400:
 *         description: Faltan campos obligatorios.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Los campos 'id_usuario', 'latitud' y 'longitud' son obligatorios."
 *       500:
 *         description: Error en el servidor al actualizar la ubicación.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error al actualizar la ubicación."
 *                 error:
 *                   type: string
 *                   example: "Error detallado del servidor."
 */
router.post('/actualizar-ubicacion', async (req, res) => {

    const { id_persona } = req.query;

    if (!id_persona) {
        return res.status(400).json({ message: "El parámetro 'id_persona' es obligatorio." });
    }

    try {
        // Obtener todos los grupos a los que pertenece el usuario
        const gruposSnapshot = await db.collection('GRUPO_PERSONA')
        .where('id_usuario', '==', id_persona)
        .get();

        if (gruposSnapshot.empty) {
        return res.status(200).json({
            message: `El usuario con id ${id_persona} no pertenece a ningún grupo.`,
            miembros: []
        });
        }

        // Obtener todos los id_grupo de los grupos a los que pertenece el usuario
        const idGrupos = gruposSnapshot.docs.map(doc => doc.data().id_grupo);

        // Usar un Set para recolectar id_usuario únicos de los miembros
        const miembrosSet = new Set();
        for (const idGrupo of idGrupos) {
        const grupoPersonaSnapshot = await db.collection('GRUPO_PERSONA')
            .where('id_grupo', '==', idGrupo)
            .get();

        grupoPersonaSnapshot.forEach(doc => {
            miembrosSet.add(doc.data().id_usuario);
        });
        }

        // Convertir el Set a un Array y obtener los datos de cada miembro
        const miembros = await Promise.all([...miembrosSet].map(async (idUsuario) => {
        const personaRef = db.collection('PERSONA').doc(idUsuario);
        const personaDoc = await personaRef.get();

        if (!personaDoc.exists) return null; // Omitir si no existe la persona

        const perfilRef = db.collection('PERFIL').doc(idUsuario);
        const perfilDoc = await perfilRef.get();

        // Extraer solo los campos necesarios de persona y perfil
        const personaData = personaDoc.data();
        const perfilData = perfilDoc.exists ? perfilDoc.data() : {};

        const persona = {
            nombre: personaData.nombre,
            apellido: personaData.apellido,
            correo: personaData.correo,
            numero_telefono: personaData.numero_telefono,
        };

        const perfil = {
            correo: perfilData.correo,
            tipo_usuario: perfilData.tipo_usuario,
        };

        // Obtener la ubicación actual si existe en la colección UBICACION_ACTUAL
        let ubicacion = null;
        const ubicacionRef = db.collection('UBICACION_ACTUAL').where('id_usuario', '==', idUsuario).limit(1);
        const ubicacionSnapshot = await ubicacionRef.get();
        
        if (!ubicacionSnapshot.empty) {
            // Si el documento de ubicación existe, obtener la data
            ubicacion = ubicacionSnapshot.docs[0].data();
        }

        // Si el miembro es el usuario solicitante, excluye la ubicación
        if (idUsuario === id_persona) {
            return {
            id_usuario: idUsuario,
            persona,
            perfil
            };
        }

        // Para otros miembros, incluye la ubicación actual si existe
        return {
            id_usuario: idUsuario,
            persona,
            perfil,
            ubicacion: ubicacion
        };
        }));

        // Filtrar miembros nulos
        const miembrosFiltrados = miembros.filter(m => m !== null);

        return res.status(200).json({
        message: 'Miembros únicos de todos los grupos obtenidos exitosamente.',
        miembros: miembrosFiltrados
        });
    } catch (error) {
        console.error('Error al obtener los miembros únicos de todos los grupos:', error);
        return res.status(500).json({
        message: 'Error al obtener los miembros únicos de todos los grupos',
        error: error.message
        });
    }
    });
      
  

module.exports = router;