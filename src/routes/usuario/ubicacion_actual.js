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
  
/**
 * @swagger
 * /actualizar-ubicacion-seleccion:
 *   post:
 *     tags: [ubicacion_seleccion]
 *     summary: Actualiza o crea un registro en la tabla UBICACION_SELECCION.
 *     description: Recibe `id_persona`, `tipo` y otros parámetros para actualizar o crear un documento en la colección "UBICACION_SELECCION".
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_persona
 *               - tipo
 *             properties:
 *               id_persona:
 *                 type: string
 *                 description: El ID de la persona cuya ubicación se va a actualizar.
 *                 example: "KpUMbpgXPrPuQW3yBBiYcAWrbUn2"
 *               tipo:
 *                 type: integer
 *                 description: El tipo de búsqueda (1 para persona, 2 para grupo, 3 para todos).
 *                 example: 2
 *               id_grupo:
 *                 type: string
 *                 description: El ID del grupo (requerido solo si tipo es 2).
 *                 example: "grupo_123"
 *               id_persona_buscar:
 *                 type: string
 *                 description: El ID de la persona que se debe buscar (requerido solo si tipo es 1).
 *                 example: "KpUMbpgXPrPuQW3yBBiYcAWrbUn2"
 *     responses:
 *       200:
 *         description: Registro actualizado o creado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ubicación seleccionada actualizada exitosamente."
 *       400:
 *         description: Error de validación o faltan parámetros.
 *       500:
 *         description: Error en el servidor al actualizar o crear el registro.
 */
router.post('/actualizar-ubicacion-seleccion', async (req, res) => {
  const { id_persona, tipo, id_grupo, id_persona_buscar } = req.body;

  if (!id_persona || tipo === undefined) {
      return res.status(400).json({ message: "Los campos 'id_persona' y 'tipo' son obligatorios." });
  }

  // Validar si el tipo es válido (1: persona, 2: grupo, 3: todos, 4: ninguno)
  if (![1, 2, 3, 4].includes(tipo)) {
      return res.status(400).json({ message: "El campo 'tipo' debe ser 1 (persona), 2 (grupo), 3 (todos), o 4 (ninguno)." });
  }

  // Preparar el objeto que se va a actualizar o crear
  const ubicacionSeleccionData = {
      id_persona,
      id_grupo: null,        // Inicialmente null
      persona_buscar: 0,     // Inicialmente 0
      grupo_buscar: 0,       // Inicialmente 0
      todos: 0,              // Inicialmente 0
      id_persona_buscar: null // Inicialmente null
  };

  // Configurar el comportamiento basado en el tipo
  switch (tipo) {
      case 1: // Tipo 1: Buscar persona
          ubicacionSeleccionData.persona_buscar = 1;
          ubicacionSeleccionData.id_persona_buscar = id_persona_buscar || id_persona;
          break;
      case 2: // Tipo 2: Buscar grupo
          ubicacionSeleccionData.grupo_buscar = 1;
          ubicacionSeleccionData.id_grupo = id_grupo;
          break;
      case 3: // Tipo 3: Buscar todos
          ubicacionSeleccionData.todos = 1;
          break;
      case 4: // Tipo 4: Deseleccionar todos
          // Todos los campos ya están inicializados como deseleccionados (valores predeterminados)
          break;
      default:
          return res.status(400).json({ message: "El valor de 'tipo' es inválido." });
  }

  try {
      // Comprobar si ya existe el registro en la colección UBICACION_SELECCION
      const ubicacionRef = db.collection('UBICACION_SELECCION').where('id_persona', '==', id_persona).limit(1);
      const ubicacionSnapshot = await ubicacionRef.get();

      if (!ubicacionSnapshot.empty) {
          // Si el registro existe, actualizarlo
          const ubicacionDoc = ubicacionSnapshot.docs[0];
          await ubicacionDoc.ref.update(ubicacionSeleccionData);
          return res.status(200).json({
              message: "Ubicación seleccionada actualizada exitosamente.",
          });
      } else {
          // Si el registro no existe, crearlo
          await db.collection('UBICACION_SELECCION').add(ubicacionSeleccionData);
          return res.status(200).json({
              message: "Ubicación seleccionada creada exitosamente.",
          });
      }

  } catch (error) {
      console.error('Error al actualizar o crear el registro de ubicación seleccionada:', error);
      return res.status(500).json({
          message: "Error al actualizar o crear el registro de ubicación seleccionada.",
          error: error.message,
      });
  }
});

/**
 * @swagger
 * /obtener-ubicacion-seleccion:
 *   get:
 *     tags:
 *       - ubicacion_seleccion
 *     summary: "Obtiene los miembros según el filtro de búsqueda"
 *     description: |
 *       Esta API devuelve los detalles básicos (id_persona, nombre, apellido, imagen, rut) de los usuarios según el filtro de búsqueda:
 *       - Si `persona_buscar` está activo (1), devuelve solo los datos de la persona buscada.
 *       - Si `grupo_buscar` está activo (1), devuelve los miembros del grupo.
 *       - Si `todos` está activo (1), devuelve todos los miembros de los grupos a los que pertenece la persona solicitante.
 *     parameters:
 *       - name: id_persona
 *         in: query
 *         description: "ID de la persona que hace la solicitud."
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: "Miembros obtenidos exitosamente."
 *         schema:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *               example: "Miembros obtenidos exitosamente."
 *             tipo_actual:
 *               type: string
 *               description: "El tipo de búsqueda que está activo actualmente."
 *               example: "persona_buscar"  # Puede ser 'persona_buscar', 'grupo_buscar', o 'todos'
 *             miembros:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_persona:
 *                     type: string
 *                     example: "KpUMbpgXPrPuQW3yBBiYcAWrbUn2"
 *                   nombre:
 *                     type: string
 *                     example: "Juan"
 *                   apellido:
 *                     type: string
 *                     example: "Pérez"
 *                   rut:
 *                     type: string
 *                     example: "12345678-9"
 *                   imagen:
 *                     type: string
 *                     example: "https://example.com/images/imagen.jpg"
 *       400:
 *         description: "El parámetro 'id_persona' es obligatorio."
 *         schema:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *               example: "El parámetro 'id_persona' es obligatorio."
 *       404:
 *         description: "No se encontró el registro para la persona proporcionada."
 *         schema:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *               example: "No se encontró registro para la persona proporcionada."
 *       500:
 *         description: "Error interno del servidor."
 *         schema:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *               example: "Error al obtener los miembros de ubicación seleccionada."
 *             error:
 *               type: string
 *               example: "Error detallado del servidor."
 */
router.get('/listar-ubicacion-seleccion', async (req, res) => {
  const { id_persona } = req.query;

  if (!id_persona) {
    return res.status(400).json({ message: "El parámetro 'id_persona' es obligatorio." });
  }

  try {
    // Obtener la configuración actual de UBICACION_SELECCION
    const ubicacionSnapshot = await db.collection('UBICACION_SELECCION')
      .where('id_persona', '==', id_persona)
      .limit(1)
      .get();

    let ubicacionData;

    if (ubicacionSnapshot.empty) {
      // Si no hay datos, asumimos que "todos" está en 1
      ubicacionData = { todos: 1 };
    } else {
      // Si hay datos, tomamos la información del primer documento
      ubicacionData = ubicacionSnapshot.docs[0].data();
    }

    let idUsuarios = [];
    let tipoActual = '';
    let tipoNumerico = 0;
    let idRelacion = null; // Será el id_grupo o id_persona_buscar según el caso
    let grupoInfo = {}; // Información del grupo

    // Determinar qué tipo está seleccionado
    if (ubicacionData.todos === 1) {
      // Caso "todos": Obtener todos los grupos del usuario y sus miembros
      tipoActual = 'todos';
      tipoNumerico = 3;

      const gruposSnapshot = await db.collection('GRUPO_PERSONA')
        .where('id_usuario', '==', id_persona)
        .get();

      const idGrupos = gruposSnapshot.docs.map(doc => doc.data().id_grupo);

      const miembrosSet = new Set();

      for (const idGrupo of idGrupos) {
        const grupoPersonaSnapshot = await db.collection('GRUPO_PERSONA')
          .where('id_grupo', '==', idGrupo)
          .get();

        grupoPersonaSnapshot.forEach(doc => {
          miembrosSet.add(doc.data().id_usuario);
        });
      }

      idUsuarios = [...miembrosSet].filter(id => id !== id_persona);

    } else if (ubicacionData.grupo_buscar === 1) {
      // Caso "grupo_buscar": Obtener los miembros de un grupo específico
      tipoActual = 'grupo_buscar';
      tipoNumerico = 2;
      idRelacion = ubicacionData.id_grupo;

      const grupoPersonaSnapshot = await db.collection('GRUPO_PERSONA')
        .where('id_grupo', '==', ubicacionData.id_grupo)
        .get();

      idUsuarios = grupoPersonaSnapshot.docs
        .map(doc => doc.data().id_usuario)
        .filter(id => id !== id_persona);

      // Obtener información del grupo (nombre y descripción)
      const grupoRef = db.collection('GRUPO').doc(ubicacionData.id_grupo);
      const grupoDoc = await grupoRef.get();

      if (grupoDoc.exists) {
        grupoInfo = {
          nombre_grupo: grupoDoc.data().nombre_grupo,
          descripcion: grupoDoc.data().descripcion
        };
      }
    } else if (ubicacionData.persona_buscar === 1) {
      // Caso "persona_buscar": Obtener una persona específica
      tipoActual = 'persona_buscar';
      tipoNumerico = 1;
      idRelacion = ubicacionData.id_persona_buscar;

      idUsuarios = [ubicacionData.id_persona_buscar];
    } else {
      // Caso "nada seleccionado"
      tipoActual = 'nada_seleccionado';
      tipoNumerico = 4;

      return res.status(200).json({
        message: 'No hay ningún tipo seleccionado en la configuración actual.',
        tipo_actual: tipoActual,
        tipo_numerico: tipoNumerico,
        id_relacion: idRelacion, // null porque no hay relación seleccionada
        miembros: [],
        grupo: {} // Sin información del grupo
      });
    }

    // Obtener los detalles de los usuarios seleccionados
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
      message: 'Datos listados exitosamente según la configuración actual.',
      tipo_actual: tipoActual,
      tipo_numerico: tipoNumerico,
      id_relacion: idRelacion, // Será el id_grupo o id_persona_buscar según el caso
      grupo: grupoInfo,        // Información del grupo (si aplica)
      miembros: miembrosFiltrados
    });
  } catch (error) {
    console.error('Error al listar los datos:', error);
    return res.status(500).json({
      message: 'Error al listar los datos según la ubicación seleccionada.',
      error: error.message
    });
  }
});

module.exports = router;