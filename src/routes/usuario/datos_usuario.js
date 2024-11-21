const express = require('express');
const { admin, db, bucket } = require('../../config/firebase'); // Importamos admin, db y bucket desde firebase.js
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

/**
 * @swagger
 * /update-profile:
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
 *               uid:
 *                 type: string
 *                 description: El UID del usuario. (Requerido)
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
 *         description: No se proporcionaron campos válidos para actualizar o faltó el parámetro obligatorio 'uid'.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "El parámetro 'uid' es obligatorio."
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
    if (fecha_nacimiento) updateDataPersona.fecha_nacimiento = fecha_nacimiento;

    // Asignar datos a PERFIL
    if (nombre_usuario) updateDataPerfil.nombre_usuario = nombre_usuario;

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
 * /user:
 *   get:
 *     tags: [usuario_datos_usuario]
 *     summary: Obtiene los datos combinados de las colecciones PERFIL y PERSONA.
 *     description: Retorna los datos de perfil y persona de un usuario en base a su UID.
 *     parameters:
 *       - name: uid
 *         in: query
 *         required: true
 *         description: El UID del usuario.
 *         schema:
 *           type: string
 *           example: abc123
 *     responses:
 *       200:
 *         description: Datos del usuario obtenidos exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 persona:
 *                   type: object
 *                   description: Datos de la colección PERSONA.
 *                   example:
 *                     nombre: "Juan"
 *                     apellido: "Pérez"
 *                     correo: "juan.perez@example.com"
 *                     numero_telefono: "123456789"
 *                     rut: "12345678-9"
 *                     fecha_nacimiento: "1990-05-15"
 *                     direccion: "Calle Falsa 123"
 *                     id_comuna: "0uitcldou0fT6sADzScd"
 *                     id_genero: "male"
 *                 perfil:
 *                   type: object
 *                   description: Datos de la colección PERFIL.
 *                   example:
 *                     correo: "juan.perez@example.com"
 *                     password: "password123"
 *                     imagen_usuario: "https://storage.googleapis.com/your-bucket/profile-images/abc123.jpg"
 *                     tipo_usuario: "kwLQngxZFsGKG3a3K1xO"
 *       404:
 *         description: Usuario no encontrado en alguna de las colecciones.
 *       500:
 *         description: Error al obtener los datos del usuario.
 */
router.get('/user', async (req, res) => {
  const { uid } = req.query; // Recibir el UID como parámetro de la query string

  if (!uid) {
    return res.status(400).json({ message: "El parámetro 'uid' es obligatorio." });
  }

  try {
    // Obtener datos de la colección PERSONA
    const personaRef = db.collection('PERSONA').doc(uid);
    const personaDoc = await personaRef.get();

    if (!personaDoc.exists) {
      return res.status(200).json({ message: "Usuario no encontrado en PERSONA.", usuarioData: [] });
    }

    // Obtener datos de la colección PERFIL
    const perfilRef = db.collection('PERFIL').doc(uid);
    const perfilDoc = await perfilRef.get();

    if (!perfilDoc.exists) {
      return res.status(200).json({ message: "Usuario no encontrado en PERFIL.", usuarioData: [] });
    }

    const perfilData = perfilDoc.data();

    // Obtener datos de la colección TIPO_USUARIO usando el tipo_usuario del perfil
    const tipoUsuarioId = perfilData.tipo_usuario; // ID del tipo de usuario
    const tipoUsuarioRef = db.collection('TIPO_USUARIO').doc(tipoUsuarioId);
    const tipoUsuarioDoc = await tipoUsuarioRef.get();

    if (!tipoUsuarioDoc.exists) {
      return res.status(404).json({
        message: "No se encontró el tipo de usuario asociado.",
        usuarioData: [],
      });
    }

    const tipoUsuarioData = tipoUsuarioDoc.data();

    // Combinar los datos de PERSONA, PERFIL y TIPO_USUARIO
    const usuarioData = {
      persona: personaDoc.data(),
      perfil: {
        ...perfilData,
        tipo_usuario: tipoUsuarioData, // Agregar la descripción completa del tipo de usuario
      },
    };

    // Devolver los datos combinados
    return res.status(200).json(usuarioData);

  } catch (error) {
    console.error("Error al obtener los datos del usuario:", error);
    return res.status(500).json({ message: "Error al obtener los datos del usuario." });
  }
});


module.exports = router;
