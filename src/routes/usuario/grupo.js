// Importaciones
const express = require('express');
const { admin, db, bucket } = require('../../config/firebase');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Configurar Multer para manejar la subida de archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // Limitar tamaño de la imagen a 5MB
  }
});

// Crear grupo
/**
 * @swagger
 * /crear-grupo:
 *   post:
 *     tags: [usuario_grupo]
 *     summary: Crea un nuevo grupo y agrega automáticamente al usuario creador al grupo.
 *     description: Este endpoint permite crear un nuevo grupo y automáticamente añadir al usuario creador al grupo. También permite especificar un color de grupo, una imagen opcional y una descripción del grupo.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - nombre_grupo
 *               - id_usuario_creador
 *               - color_hex
 *               - descripcion
 *             properties:
 *               nombre_grupo:
 *                 type: string
 *                 description: El nombre del grupo a crear.
 *                 example: "Grupo de Amigos"
 *               id_usuario_creador:
 *                 type: string
 *                 description: El ID del usuario que está creando el grupo.
 *                 example: "2ME9VRJaHwOvqitEOVAHATLy33e2"
 *               color_hex:
 *                 type: string
 *                 description: El color que representará al grupo (en formato hexadecimal).
 *                 example: "#ff5733"
 *               descripcion:
 *                 type: string
 *                 description: Una breve descripción del grupo.
 *                 example: "Este es un grupo para planificar salidas entre amigos."
 *               imagen:
 *                 type: string
 *                 format: binary
 *                 description: Imagen que representará al grupo (opcional).
 *     responses:
 *       201:
 *         description: Grupo creado exitosamente y usuario agregado al grupo.
 *       400:
 *         description: Error de validación, faltan campos obligatorios.
 *       500:
 *         description: Error al crear el grupo o al agregar al usuario.
 */
router.post("/crear-grupo", upload.single('imagen'), async (req, res) => {
  const { nombre_grupo, id_usuario_creador, color_hex, descripcion } = req.body;

  if (!nombre_grupo || !id_usuario_creador || !color_hex) {
    return res.status(400).json({ message: "Los campos 'nombre_grupo', 'id_usuario_creador' y 'color_hex' son requeridos" });
  }

  try {
    const grupoRef = db.collection("GRUPO").doc(); // Genera un nuevo ID automáticamente
    const id_grupo = grupoRef.id;

    let imagen_url = null;
    if (req.file) {
      const fileName = `grupos/${id_grupo}_${Date.now()}${path.extname(req.file.originalname)}`;
      const file = bucket.file(fileName);

      await file.save(req.file.buffer, {
        metadata: { contentType: req.file.mimetype },
      });

      await file.makePublic();
      imagen_url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    }

    const nuevoGrupo = {
      id_grupo,
      nombre_grupo,
      color_hex,
      descripcion,
      imagen_url,
      estado: true,
      id_usuario: id_usuario_creador,
    };

    await grupoRef.set(nuevoGrupo);

    const grupoPersonaRef = db.collection("GRUPO_PERSONA").doc();
    const grupoPersona = {
      id_GrupoPersona: grupoPersonaRef.id,
      id_grupo,
      id_usuario: id_usuario_creador,
    };

    await grupoPersonaRef.set(grupoPersona);

    return res.status(201).json({
      message: "Grupo creado exitosamente y usuario agregado al grupo",
      grupo: nuevoGrupo,
      grupoPersona
    });
  } catch (error) {
    console.error("Error al crear el grupo o al agregar al usuario:", error);
    return res.status(500).json({ message: "Error al crear el grupo o al agregar al usuario", error });
  }
});

// Eliminar grupo
/**
 * @swagger
 * /eliminar-grupo:
 *   delete:
 *     tags: [usuario_grupo]
 *     summary: Elimina un grupo cambiando su estado a false.
 *     description: Este endpoint cambia el estado de un grupo a false en lugar de eliminarlo físicamente de la base de datos.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_grupo
 *             properties:
 *               id_grupo:
 *                 type: string
 *                 description: El ID del grupo que se va a eliminar.
 *     responses:
 *       200:
 *         description: Grupo eliminado exitosamente.
 *       400:
 *         description: Error de validación, falta el ID del grupo.
 *       404:
 *         description: No se encontró el grupo con el ID proporcionado.
 *       500:
 *         description: Error al eliminar el grupo.
 */
router.delete("/eliminar-grupo", async (req, res) => {
  const { id_grupo } = req.body;

  if (!id_grupo) {
    return res.status(400).json({ message: "El campo 'id_grupo' es requerido" });
  }

  try {
    const grupoRef = db.collection("GRUPO").doc(id_grupo);
    const grupoDoc = await grupoRef.get();

    if (!grupoDoc.exists) {
      return res.status(200).json({ message: `No se encontró el grupo con id: ${id_grupo}` });
    }

    // Cambiar el estado del grupo a `false`
    await grupoRef.update({ estado: false });

    // Buscar registros en `UBICACION_SELECCION` donde `id_grupo` esté seleccionado
    const ubicacionSeleccionRef = db.collection("UBICACION_SELECCION").where("id_grupo", "==", id_grupo);
    const ubicacionSnapshot = await ubicacionSeleccionRef.get();

    if (!ubicacionSnapshot.empty) {
      // Actualizar todos los registros afectados
      const batch = db.batch();
      ubicacionSnapshot.forEach((doc) => {
        batch.update(doc.ref, {
          id_grupo: null,       // Eliminar la referencia al grupo
          grupo_buscar: 0       // Desactivar la búsqueda por grupo
        });
      });
      await batch.commit();
    }

    return res.status(200).json({ 
      message: "Grupo eliminado exitosamente (estado cambiado a false) y ubicaciones seleccionadas actualizadas." 
    });
  } catch (error) {
    console.error("Error al eliminar el grupo:", error);
    return res.status(500).json({ 
      message: "Error al eliminar el grupo",
      error: error.message 
    });
  }
});

// Editar grupo
/**
 * @swagger
 * /editar-grupo:
 *   put:
 *     tags: [usuario_grupo]
 *     summary: Edita la información de un grupo existente.
 *     description: Permite actualizar los datos de un grupo, incluyendo su nombre, color, descripción y la imagen asociada.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - id_grupo
 *               - nombre_grupo
 *               - color_hex
 *               - descripcion
 *             properties:
 *               id_grupo:
 *                 type: string
 *                 description: El ID del grupo que se va a editar.
 *               nombre_grupo:
 *                 type: string
 *               color_hex:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               imagen:
 *                 type: string
 *                 format: binary
 *                 description: La nueva imagen del grupo (opcional).
 *     responses:
 *       200:
 *         description: Grupo actualizado exitosamente.
 *       400:
 *         description: Error de validación, faltan campos obligatorios.
 *       404:
 *         description: Grupo no encontrado.
 *       500:
 *         description: Error al actualizar el grupo.
 */
router.put('/editar-grupo', upload.single('imagen'), async (req, res) => {
  const { id_grupo, nombre_grupo, color_hex, descripcion } = req.body;

  if (!id_grupo || !nombre_grupo || !color_hex || !descripcion) {
    return res.status(400).json({ message: "Los campos 'id_grupo', 'nombre_grupo', 'color_hex' y 'descripcion' son obligatorios." });
  }

  try {
    const grupoRef = db.collection('GRUPO').doc(id_grupo);
    const grupoDoc = await grupoRef.get();

    if (!grupoDoc.exists) {
      return res.status(200).json({ message: `No se encontró el grupo con id: ${id_grupo}` });
    }

    let updateData = { nombre_grupo, color_hex, descripcion };

    await grupoRef.update(updateData);

    if (req.file) {
      const fileName = `grupos/${id_grupo}_${Date.now()}${path.extname(req.file.originalname)}`;
      const file = bucket.file(fileName);

      await file.save(req.file.buffer, {
        metadata: { contentType: req.file.mimetype },
      });

      await file.makePublic();
      const imagen_url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      updateData.imagen_url = imagen_url;
    }

    return res.status(200).json({
      message: 'Grupo actualizado exitosamente.',
      grupo: { id_grupo, ...updateData },
    });

  } catch (error) {
    console.error('Error al actualizar el grupo:', error);
    return res.status(500).json({ message: 'Error al actualizar el grupo', error });
  }
});

// Ver grupos creados por usuario
/**
 * @swagger
 * /ver-grupos-creados:
 *   get:
 *     tags: [usuario_grupo]
 *     summary: Obtiene los grupos creados por un usuario.
 *     parameters:
 *       - in: query
 *         name: id_usuario
 *         required: true
 *         description: El ID del usuario que ha creado los grupos.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Grupos activos obtenidos exitosamente.
 *       404:
 *         description: No se encontraron grupos activos.
 *       500:
 *         description: Error al obtener los grupos.
 */
router.get('/ver-grupos-creados', async (req, res) => {
  const { id_usuario } = req.query;

  try {
    const gruposSnapshot = await db.collection('GRUPO')
      .where('id_usuario', '==', id_usuario)
      .where('estado', '==', true)
      .get();

    if (gruposSnapshot.empty) {
      return res.status(200).json({ message: 'No se encontraron grupos activos para este usuario.', grupos: [] });
    }

    const grupos = gruposSnapshot.docs.map(doc => ({
      id_grupo: doc.id,
      ...doc.data()
    }));

    return res.status(200).json({
      message: 'Grupos activos obtenidos exitosamente.',
      grupos: grupos
    });
  } catch (error) {
    console.error('Error al obtener los grupos activos:', error);
    return res.status(500).json({ message: 'Error al obtener los grupos activos', error: error.message });
  }
});

// Ver grupos a los que pertenece un usuario
/**
 * @swagger
 * /ver-grupos-usuario:
 *   get:
 *     tags: [usuario_grupo]
 *     summary: Obtiene los grupos a los que pertenece un usuario.
 *     parameters:
 *       - in: query
 *         name: id_usuario
 *         required: true
 *         description: El ID del usuario para obtener los grupos.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Grupos activos obtenidos exitosamente.
 *       404:
 *         description: No se encontraron grupos.
 *       500:
 *         description: Error al obtener los grupos.
 */
router.get('/ver-grupos-usuario', async (req, res) => {
  const { id_usuario } = req.query;

  try {
    const grupoPersonaSnapshot = await db.collection('GRUPO_PERSONA')
      .where('id_usuario', '==', id_usuario)
      .get();

    if (grupoPersonaSnapshot.empty) {
      return res.status(200).json({ message: 'No se encontraron grupos para este usuario.', gruposActivos: [] });
    }

    const idGrupos = grupoPersonaSnapshot.docs.map(doc => doc.data().id_grupo);

    if (idGrupos.length === 0) {
      return res.status(200).json({ message: 'El usuario no pertenece a ningún grupo.', gruposActivos: [] });
    }

    const gruposActivosSnapshot = await db.collection('GRUPO')
      .where(admin.firestore.FieldPath.documentId(), 'in', idGrupos)
      .where('estado', '==', true)
      .get();

    if (gruposActivosSnapshot.empty) {
      return res.status(200).json({ message: 'No se encontraron grupos activos para este usuario.', gruposActivos: [] });
    }

    const gruposActivos = gruposActivosSnapshot.docs.map(doc => ({
      id_grupo: doc.id,
      ...doc.data()
    }));

    return res.status(200).json({
      message: 'Grupos activos obtenidos exitosamente.',
      grupos: gruposActivos
    });
  } catch (error) {
    console.error('Error al obtener los grupos activos del usuario:', error);
    return res.status(500).json({ message: 'Error al obtener los grupos activos del usuario', error: error.message });
  }
});

// Obtener información completa del grupo
/**
 * @swagger
 * /grupo-completo:
 *   get:
 *     tags: [usuario_grupo]
 *     summary: Obtiene la información completa de un grupo.
 *     parameters:
 *       - in: query
 *         name: id_grupo
 *         required: true
 *         description: El ID del grupo para obtener la información.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Información del grupo obtenida exitosamente.
 *       404:
 *         description: No se encontraron datos para el grupo.
 *       500:
 *         description: Error al obtener la información.
 */
router.get('/grupo-completo', async (req, res) => {
  const { id_grupo } = req.query;

  try {
    const grupoRef = db.collection('GRUPO').doc(id_grupo);
    const grupoDoc = await grupoRef.get();

    if (!grupoDoc.exists) {
      return res.status(200).json({ message: `El grupo con id ${id_grupo} no existe.`, grupo: [], miembros: [] });
    }

    const grupoData = grupoDoc.data();

    const grupoPersonaSnapshot = await db.collection('GRUPO_PERSONA')
      .where('id_grupo', '==', id_grupo)
      .get();

    if (grupoPersonaSnapshot.empty) {
      return res.status(200).json({ message: 'No se encontraron miembros para este grupo.', grupo: [], miembros: [] });
    }

    const idUsuarios = grupoPersonaSnapshot.docs.map(doc => doc.data().id_usuario);

    if (idUsuarios.length === 0) {
      return res.status(200).json({ message: 'No hay miembros en este grupo.', grupo: [], miembros: [] });
    }

    const miembros = await Promise.all(idUsuarios.map(async (idUsuario) => {
      const personaRef = db.collection('PERSONA').doc(idUsuario);
      const personaDoc = await personaRef.get();
      if (!personaDoc.exists) return null;

      const perfilRef = db.collection('PERFIL').doc(idUsuario);
      const perfilDoc = await perfilRef.get();

      return {
        id_usuario: idUsuario,
        persona: personaDoc.data(),
        perfil: perfilDoc.exists ? perfilDoc.data() : {}
      };
    }));

    const miembrosFiltrados = miembros.filter(m => m !== null);

    return res.status(200).json({
      message: 'Información completa del grupo obtenida exitosamente.',
      grupo: { id_grupo, ...grupoData },
      miembros: miembrosFiltrados
    });
  } catch (error) {
    console.error('Error al obtener la información completa del grupo:', error);
    return res.status(500).json({ message: 'Error al obtener la información completa del grupo', error: error.message });
  }
});

// Invitar usuario
/**
 * @swagger
 * /invitar-usuario:
 *   post:
 *     tags: [usuario_grupo]
 *     summary: Invita a un usuario a un grupo mediante su número de teléfono.
 *     description: Permite invitar a un usuario a un grupo utilizando su número de teléfono.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_grupo
 *               - celular
 *               - id_usuario_emisor
 *             properties:
 *               id_grupo:
 *                 type: string
 *                 description: El ID del grupo al que se invita.
 *               celular:
 *                 type: string
 *                 description: El número de teléfono del usuario a invitar.
 *               id_usuario_emisor:
 *                 type: string
 *                 description: El ID del usuario que envía la invitación.
 *     responses:
 *       201:
 *         description: Invitación enviada exitosamente.
 *       404:
 *         description: No se encontró un usuario con el número de teléfono proporcionado.
 *       400:
 *         description: Error de validación, el usuario ya pertenece al grupo o ya tiene una invitación pendiente.
 *       500:
 *         description: Error al enviar la invitación.
 */
router.post("/invitar-usuario", upload.none(), async (req, res) => {
  const { id_grupo, celular, id_usuario_emisor } = req.body;

  if (!id_grupo || !celular || !id_usuario_emisor) {
    return res.status(400).json({ message: "Los campos 'id_grupo', 'celular' y 'id_usuario_emisor' son requeridos" });
  }

  try {
    const usuarioSnapshot = await db.collection("PERSONA").where("numero_telefono", "==", celular).get();

    if (usuarioSnapshot.empty) {
      return res.status(200).json({ message: "No se encontró un usuario con el número de teléfono proporcionado" });
    }

    const usuarioDoc = usuarioSnapshot.docs[0];
    const id_usuario = usuarioDoc.id;

    const grupoPersonaSnapshot = await db.collection("GRUPO_PERSONA")
      .where("id_grupo", "==", id_grupo)
      .where("id_usuario", "==", id_usuario)
      .get();

    if (!grupoPersonaSnapshot.empty) {
      return res.status(200).json({ message: "El usuario ya pertenece a este grupo" });
    }

    const invitacionSnapshot = await db.collection("InvitacionGrupo")
      .where("id_grupo", "==", id_grupo)
      .where("id_usuario", "==", id_usuario)
      .where("estado", "==", true)
      .where("aceptado", "==", false)
      .get();

    if (!invitacionSnapshot.empty) {
      return res.status(200).json({ message: "Ya existe una invitación pendiente para este usuario en este grupo" });
    }

    const invitacionRef = db.collection("InvitacionGrupo").doc();
    const nuevaInvitacion = {
      id_InvitacionGrupo: invitacionRef.id,
      id_grupo,
      id_usuario,
      id_usuario_emisor,
      aceptado: false,
      estado: true,
      fecha_invitacion: admin.firestore.Timestamp.now(),
    };

    await invitacionRef.set(nuevaInvitacion);

    return res.status(201).json({
      message: "Invitación enviada exitosamente",
      invitacion: nuevaInvitacion,
    });
  } catch (error) {
    console.error("Error al enviar la invitación:", error);
    return res.status(500).json({ message: "Error al enviar la invitación", error: error.message });
  }
});

// Ver invitaciones
/**
 * @swagger
 * /ver-invitaciones:
 *   get:
 *     tags: [usuario_grupo]
 *     summary: Ver las invitaciones pendientes para un usuario.
 *     parameters:
 *       - in: query
 *         name: id_usuario
 *         required: true
 *         description: El ID del usuario para obtener las invitaciones pendientes.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitaciones obtenidas exitosamente.
 *       404:
 *         description: No se encontraron invitaciones pendientes para este usuario.
 *       500:
 *         description: Error al obtener las invitaciones.
 */
router.get('/ver-invitaciones', async (req, res) => {
  const { id_usuario } = req.query;

  if (!id_usuario) {
    return res.status(400).json({ message: "El campo 'id_usuario' es requerido" });
  }

  try {
    // Obtener las invitaciones pendientes para el usuario
    const invitacionesSnapshot = await db.collection("InvitacionGrupo")
      .where("id_usuario", "==", id_usuario)
      .where("estado", "==", true)
      .where("aceptado", "==", false)
      .get();

    if (invitacionesSnapshot.empty) {
      return res.status(200).json({ message: "No se encontraron invitaciones pendientes para este usuario.", invitaciones: [] });
    }

    // Crear una lista de invitaciones y obtener los emisores y grupos
    const invitaciones = await Promise.all(invitacionesSnapshot.docs.map(async (doc) => {
      const invitacion = {
        id_InvitacionGrupo: doc.id,
        ...doc.data()
      };

      // Obtener el nombre y apellido del usuario emisor (id_usuario_emisor)
      if (invitacion.id_usuario_emisor) {
        const personaRef = db.collection("PERSONA").doc(invitacion.id_usuario_emisor);
        const personaDoc = await personaRef.get();

        if (personaDoc.exists) {
          const personaData = personaDoc.data();
          invitacion.emisor = {
            nombre: personaData.nombre,
            apellido: personaData.apellido
          };
        } else {
          invitacion.emisor = { nombre: "Desconocido", apellido: "" }; // Si no se encuentra el emisor
        }
      } else {
        invitacion.emisor = { nombre: "Desconocido", apellido: "" }; // Si no hay id_usuario_emisor
      }

      // Obtener el nombre y descripción del grupo (id_grupo)
      if (invitacion.id_grupo) {
        const grupoRef = db.collection("GRUPO").doc(invitacion.id_grupo);
        const grupoDoc = await grupoRef.get();

        if (grupoDoc.exists) {
          const grupoData = grupoDoc.data();
          invitacion.grupo = {
            nombre_grupo: grupoData.nombre_grupo,
            descripcion: grupoData.descripcion
          };
        } else {
          invitacion.grupo = { nombre_grupo: "Desconocido", descripcion: "" }; // Si no se encuentra el grupo
        }
      } else {
        invitacion.grupo = { nombre_grupo: "Desconocido", descripcion: "" }; // Si no hay id_grupo
      }

      return invitacion;
    }));

    return res.status(200).json({
      message: "Invitaciones obtenidas exitosamente",
      invitaciones: invitaciones
    });
  } catch (error) {
    console.error("Error al obtener las invitaciones:", error);
    return res.status(500).json({ message: "Error al obtener las invitaciones", error: error.message });
  }
});

// Responder invitación
/**
 * @swagger
 * /responder-invitacion:
 *   post:
 *     tags: [usuario_grupo]
 *     summary: Responde a una invitación de grupo (aceptar o rechazar).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_InvitacionGrupo
 *               - aceptar
 *             properties:
 *               id_InvitacionGrupo:
 *                 type: string
 *                 description: El ID de la invitación.
 *               aceptar:
 *                 type: boolean
 *                 description: True para aceptar, false para rechazar.
 *     responses:
 *       200:
 *         description: Respuesta a la invitación procesada exitosamente.
 *       404:
 *         description: No se encontró la invitación o ya fue utilizada.
 *       400:
 *         description: La invitación ya fue utilizada o está desactivada.
 *       500:
 *         description: Error al procesar la respuesta.
 */
router.post("/responder-invitacion", upload.none(), async (req, res) => {
  const { id_InvitacionGrupo, aceptar } = req.body;

  if (!id_InvitacionGrupo || aceptar === undefined) {
    return res.status(400).json({ message: "El campo 'id_InvitacionGrupo' es requerido, y 'aceptar' debe ser true o false." });
  }

  try {
    const invitacionRef = db.collection("InvitacionGrupo").doc(id_InvitacionGrupo);
    const invitacionDoc = await invitacionRef.get();

    if (!invitacionDoc.exists) {
      return res.status(200).json({ message: "No se encontró la invitación" });
    }

    const invitacionData = invitacionDoc.data();

    if (!invitacionData.estado || invitacionData.aceptado !== false) {
      return res.status(400).json({ message: "La invitación ya fue utilizada o está desactivada" });
    }

    const { id_grupo, id_usuario } = invitacionData;

    if (aceptar) {
      const grupoPersonaSnapshot = await db.collection("GRUPO_PERSONA")
        .where("id_grupo", "==", id_grupo)
        .where("id_usuario", "==", id_usuario)
        .get();

      if (!grupoPersonaSnapshot.empty) {
        return res.status(400).json({ message: "El usuario ya pertenece a este grupo" });
      }

      const grupoPersonaRef = db.collection("GRUPO_PERSONA").doc();
      const nuevoGrupoPersona = {
        id_GrupoPersona: grupoPersonaRef.id,
        id_grupo,
        id_usuario,
      };

      await grupoPersonaRef.set(nuevoGrupoPersona);

      await invitacionRef.update({
        aceptado: true,
        estado: false,
      });

      return res.status(200).json({
        message: "Invitación aceptada y usuario agregado al grupo exitosamente",
        grupoPersona: nuevoGrupoPersona,
      });

    } else {
      await invitacionRef.update({
        aceptado: false,
        estado: false,
      });

      return res.status(200).json({
        message: "Invitación rechazada exitosamente",
      });
    }

  } catch (error) {
    console.error("Error al responder la invitación:", error);
    return res.status(500).json({ message: "Error al responder la invitación", error: error.message });
  }
});

// Eliminar usuario de un grupo
/**
 * @swagger
 * /grupo/eliminar-usuario:
 *   post:
 *     tags: [usuario_grupo]
 *     summary: Elimina a un usuario de un grupo.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_grupo
 *               - id_usuario
 *             properties:
 *               id_grupo:
 *                 type: string
 *                 description: El ID del grupo del que se eliminará al usuario.
 *               id_usuario:
 *                 type: string
 *                 description: El ID del usuario que se eliminará del grupo.
 *     responses:
 *       200:
 *         description: Usuario eliminado del grupo exitosamente.
 *       404:
 *         description: El usuario no pertenece al grupo o ya ha sido eliminado.
 *       500:
 *         description: Error al eliminar al usuario del grupo.
 */
router.post("/grupo/eliminar-usuario", upload.none(), async (req, res) => {
  const { id_grupo, id_usuario } = req.body;

  if (!id_grupo || !id_usuario) {
    return res.status(400).json({ message: "Los campos 'id_grupo' e 'id_usuario' son requeridos" });
  }

  try {
    const grupoPersonaSnapshot = await db.collection("GRUPO_PERSONA")
      .where("id_grupo", "==", id_grupo)
      .where("id_usuario", "==", id_usuario)
      .get();

    if (grupoPersonaSnapshot.empty) {
      return res.status(200).json({ message: "El usuario no pertenece a este grupo o ya ha sido eliminado" });
    }

    const batch = db.batch();
    grupoPersonaSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return res.status(200).json({
      message: "Usuario eliminado del grupo exitosamente",
      id_grupo,
      id_usuario
    });

  } catch (error) {
    console.error("Error al eliminar el usuario del grupo:", error);
    return res.status(500).json({ message: "Error al eliminar el usuario del grupo", error: error.message });
  }
});

module.exports = router;
