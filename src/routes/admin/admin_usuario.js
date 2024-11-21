require('dotenv').config();
const express = require('express');
const router = express.Router();
require('dotenv').config();
const { db, bucket } = require('../../config/firebase'); // Importamos admin, db y bucket desde firebase.js
const multer = require('multer');
const axios = require('axios');
const path = require('path');

// Aquí debes poner la API Key de tu proyecto Firebase
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
console.log(FIREBASE_API_KEY)

// Configurar Multer para manejar la subida de archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Limitar tamaño de la imagen a 5MB
  },
});

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
 *     tags: [usuario_datos_usuario]
 *     summary: Modifica los datos del perfil del usuario (nombre, apellido, teléfono, dirección, correo, imagen, etc.).
 *     description: Permite actualizar el nombre, apellido, número de teléfono, dirección, correo, fecha de nacimiento, imagen de perfil del usuario y otros datos relevantes. Si se proporciona una imagen, esta se sube a Firebase Storage.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               id_persona:
 *                 type: string
 *                 description: El ID de la persona. (Requerido)
 *                 example: "abc123"
 *               nombre:
 *                 type: string
 *                 description: El nuevo nombre del usuario. (Opcional)
 *                 example: "Juanito"
 *               apellido:
 *                 type: string
 *                 description: El nuevo apellido del usuario. (Opcional)
 *                 example: "Pérez"
 *               numero_telefono:
 *                 type: string
 *                 description: El nuevo número de teléfono del usuario. (Opcional)
 *                 example: "123456789"
 *               direccion:
 *                 type: string
 *                 description: La nueva dirección del usuario. (Opcional)
 *                 example: "Calle Falsa 123"
 *               correo:
 *                 type: string
 *                 description: El nuevo correo electrónico del usuario. (Opcional)
 *                 example: "juan.perez.nuevo@example.com"
 *               fecha_nacimiento:
 *                 type: string
 *                 format: date
 *                 description: La nueva fecha de nacimiento del usuario. (Opcional)
 *                 example: "1990-05-15"
 *               imagen_usuario:
 *                 type: string
 *                 format: binary
 *                 description: La nueva imagen de perfil del usuario. (Opcional)
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
 *                 imageUrl:
 *                   type: string
 *                   description: URL pública de la nueva imagen (si se subió).
 *                   example: "https://storage.googleapis.com/your-bucket/profile-images/abc123.jpg"
 *       400:
 *         description: No se proporcionaron campos válidos para actualizar o faltó el parámetro obligatorio 'id_persona'.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "El parámetro 'id_persona' es obligatorio."
 *       500:
 *         description: Error al actualizar el perfil.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error al actualizar el perfil."
 *                 error:
 *                   type: string
 *                   description: Detalles del error ocurrido.
 *                   example: "Error de conexión a la base de datos."
 */
router.put('/update-profile', upload.single('imagen_usuario'), async (req, res) => {
  const {
    uid, // ID del documento en Firestore
    nombre,
    apellido,
    numero_telefono,
    direccion,
    fecha_nacimiento, // Opcional
    nombre_usuario, // Campo adicional para PERFIL
  } = req.body;

  if (!uid) {
    return res.status(400).json({ message: "El parámetro 'uid' es obligatorio." });
  }

  // Separar los datos para actualizar en cada colección
  const updateDataPersona = {};
  const updateDataPerfil = {};

  try {
    // Asignar datos a PERSONA
    if (nombre) updateDataPersona.nombre = nombre;
    if (apellido) updateDataPersona.apellido = apellido;
    if (numero_telefono) updateDataPersona.numero_telefono = numero_telefono;
    if (direccion) updateDataPersona.direccion = direccion;
    if (correo) updateDataPersona.correo = correo;
    if (fecha_nacimiento) updateDataPersona.fecha_nacimiento = fecha_nacimiento;

    // Asignar datos a PERFIL
    if (nombre_usuario) updateDataPerfil.nombre_usuario = nombre_usuario;
    if (correo) updateDataPerfil.correo = correo;

    // Manejar la imagen de perfil
    if (req.file) {
      const fileName = `profile-images/${uid}_${Date.now()}${path.extname(req.file.originalname)}`;
      const file = bucket.file(fileName);

      const stream = file.createWriteStream({
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      stream.on('error', (error) => {
        console.error("Error al subir la imagen:", error);
        return res.status(500).json({ message: "Error al subir la imagen.", error: error.message });
      });

      stream.on('finish', async () => {
        await file.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        updateDataPerfil.imagen_usuario = publicUrl;

        // Validar si hay campos para actualizar antes de llamar a `update()`
        const personaPromise = Object.keys(updateDataPersona).length > 0
          ? db.collection('PERSONA').doc(uid).update(updateDataPersona)
          : Promise.resolve();

        const perfilPromise = Object.keys(updateDataPerfil).length > 0
          ? db.collection('PERFIL').doc(uid).update(updateDataPerfil)
          : Promise.resolve();

        await Promise.all([personaPromise, perfilPromise]);

        return res.status(200).json({
          message: 'Perfil actualizado exitosamente.',
          imageUrl: publicUrl,
        });
      });

      stream.end(req.file.buffer);
    } else {
      // Actualizar ambas colecciones si no hay imagen
      const promises = [];

      if (Object.keys(updateDataPersona).length > 0) {
        promises.push(db.collection('PERSONA').doc(uid).update(updateDataPersona));
      }

      if (Object.keys(updateDataPerfil).length > 0) {
        promises.push(db.collection('PERFIL').doc(uid).update(updateDataPerfil));
      }

      if (promises.length > 0) {
        await Promise.all(promises);
        return res.status(200).json({
          message: 'Perfil actualizado exitosamente.',
        });
      } else {
        return res.status(400).json({
          message: 'No se proporcionaron datos para actualizar.',
        });
      }
    }
  } catch (error) {
    console.error("Error al actualizar el perfil:", error);
    return res.status(500).json({
      message: "Error al actualizar el perfil.",
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

/**
 * @swagger
 * /login-admin:
 *   post:
 *     summary: Autentica al usuario con email y contraseña.
 *     tags: [login-admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - correo
 *               - password
 *             properties:
 *               correo:
 *                 type: string
 *                 description: El correo electrónico del usuario
 *                 example: "juan.perez@example.com"
 *               password:
 *                 type: string
 *                 description: La contraseña del usuario
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Usuario autenticado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Sesión iniciada exitosamente."
 *                 persona:
 *                   type: object
 *                   description: Datos del usuario de la colección PERSONA.
 *                   properties:
 *                     nombre:
 *                       type: string
 *                       example: "Juan"
 *                     apellido:
 *                       type: string
 *                       example: "Pérez"
 *                 perfil:
 *                   type: object
 *                   description: Datos del perfil de usuario de la colección PERFIL.
 *                   properties:
 *                     tipo_usuario:
 *                       type: string
 *                       example: "Usuario estándar"
 *       400:
 *         description: Error en la autenticación del usuario.
 */
router.post('/login-admin', async (req, res) => {
  const { correo, password } = req.body;

  // Verificar que los campos obligatorios estén presentes
  if (!correo || !password) {
    return res.status(400).json({
      message: "Los campos 'correo' y 'password' son obligatorios.",
    });
  }

  try {
    // Autenticar al usuario con la API de Firebase Authentication
    const response = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
      email: correo,
      password: password,
      returnSecureToken: true,
    });

    const uid = response.data.localId; // El UID del usuario autenticado

    // Buscar los datos del usuario en las colecciones PERSONA y PERFIL
    const personaRef = db.collection('PERSONA').doc(uid);
    const perfilRef = db.collection('PERFIL').doc(uid);

    const personaDoc = await personaRef.get();
    const perfilDoc = await perfilRef.get();

    
    // Verificar si el documento del perfil existe
    if (!perfilDoc.exists) {
      return res.status(200).json({
        message: 'No se encontró el perfil del usuario.',
      });
    }
    
    const perfilData = perfilDoc.data();

    // Verificar si el estado del usuario es true
    if (perfilData.estado === false) {
      return res.status(200).json({
        message: 'El usuario tiene restringido el acceso a la plataforma.',
      });
    }
    
    // Verificar el tipo de usuario en la colección TIPO_USUARIO
    const tipoUsuarioId = perfilData.tipo_usuario; // ID del tipo de usuario
    const tipoUsuarioRef = db.collection('TIPO_USUARIO').doc(tipoUsuarioId);
    const tipoUsuarioDoc = await tipoUsuarioRef.get();
    
    if (!tipoUsuarioDoc.exists) {
      return res.status(200).json({
        message: 'No se encontró el tipo de usuario asociado.',
      });
    }

    const tipoUsuarioData = tipoUsuarioDoc.data();
    
    // Comprobar si es Admin o Funcionario
    if (tipoUsuarioData.descripcion === 'admin') {
      return res.status(200).json({
        message: 'Sesión iniciada exitosamente.',
        persona: personaDoc.data(),
        perfil: {
          ...perfilData,
          tipo_usuario: tipoUsuarioData, // Incluir datos del tipo de usuario
        },
      });
    } else if (tipoUsuarioData.descripcion === 'Funcionario') {
      return res.status(200).json({
        message: 'Sesión iniciada exitosamente.',
        persona: personaDoc.data(),
        perfil: {
          ...perfilData,
          tipo_usuario: tipoUsuarioData, // Incluir datos del tipo de usuario
        },
      });
    } else {
      return res.status(200).json({
        message: 'El usuario no tiene un rol válido para iniciar sesión.',
      });
    }
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    return res.status(500).json({
      message: 'Error al iniciar sesión.',
      error: error.response ? error.response.data.error.message : error.message,
    });
  }
});

module.exports = router;
  