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
 *     summary: Modifica los datos del perfil del usuario (password, imagen y nombre de usuario).
 *     description: Permite actualizar la contraseña, el nombre de usuario y la imagen de perfil del usuario. Si se proporciona una imagen, esta se sube a Firebase Storage.
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
 *               password:
 *                 type: string
 *                 description: La nueva contraseña del usuario. (Opcional)
 *                 example: "newpassword123"
 *               nombre_usuario:
 *                 type: string
 *                 description: El nuevo nombre de usuario. (Opcional)
 *                 example: "JuanP123"
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
 *         description: No se proporcionaron campos válidos para actualizar.
 *       500:
 *         description: Error al actualizar el perfil.
 */
router.put('/update-profile', upload.single('imagen_usuario'), async (req, res) => {
  const { password, nombre_usuario, uid } = req.body;

  if (!uid) {
    return res.status(400).json({ message: "El parámetro 'uid' es obligatorio." });
  }

  let updateData = {};

  try {
    // Si se proporciona una nueva contraseña, actualiza en Firebase Authentication
    if (password) {
      await admin.auth().updateUser(uid, { password });
      updateData.password = password;
    }

    // Si se proporciona un nombre de usuario, actualiza el nombre de usuario
    if (nombre_usuario) {
      updateData.nombre_usuario = nombre_usuario;
    }

    // Si se proporciona una imagen de perfil, súbela a Firebase Storage y actualiza el campo
    if (req.file) {
      const fileName = `profile-images/${uid}_${Date.now()}${path.extname(req.file.originalname)}`;
      const file = bucket.file(fileName);

      const stream = file.createWriteStream({
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      stream.on('error', (error) => {
        console.error("Error al subir la imagen:", error);  // Agregamos logging del error
        return res.status(500).json({ message: "Error al subir la imagen.", error: error.message });
      });

      stream.on('finish', async () => {
        await file.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        updateData.imagen_usuario = publicUrl;

        // Actualizar la colección PERFIL con los nuevos datos
        await db.collection('PERFIL').doc(uid).update(updateData);

        return res.status(200).json({
          message: 'Perfil actualizado exitosamente.',
          imageUrl: publicUrl
        });
      });

      stream.end(req.file.buffer);
    } else {
      // Si no se subió imagen, solo actualiza los campos disponibles
      if (Object.keys(updateData).length > 0) {
        await db.collection('PERFIL').doc(uid).update(updateData);
      }
      return res.status(200).json({
        message: 'Perfil actualizado exitosamente.',
      });
    }
  } catch (error) {
    console.error("Error al actualizar el perfil:", error);
    return res.status(500).json({ message: "Error al actualizar el perfil.", error: error.message });
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
// Ruta para obtener los datos de un usuario por UID (en query string)
router.get('/user', async (req, res) => {
  const { uid } = req.query;  // Cambiado para recibir el UID de la query string

  if (!uid) {
    return res.status(400).json({ message: "El parámetro 'uid' es obligatorio." });
  }

  try {
    // Obtener datos de la colección PERSONA
    const personaRef = db.collection('PERSONA').doc(uid);
    const personaDoc = await personaRef.get();

    if (!personaDoc.exists) {
      return res.status(404).json({ message: "Usuario no encontrado en PERSONA." });
    }

    // Obtener datos de la colección PERFIL
    const perfilRef = db.collection('PERFIL').doc(uid);
    const perfilDoc = await perfilRef.get();

    if (!perfilDoc.exists) {
      return res.status(404).json({ message: "Usuario no encontrado en PERFIL." });
    }

    // Combinar los datos de PERSONA y PERFIL
    const usuarioData = {
      persona: personaDoc.data(),
      perfil: perfilDoc.data(),
    };

    // Devolver los datos combinados
    return res.status(200).json(usuarioData);

  } catch (error) {
    console.error("Error al obtener los datos del usuario:", error);
    return res.status(500).json({ message: "Error al obtener los datos del usuario." });
  }
});


module.exports = router;
