require('dotenv').config();
const express = require('express');
const { admin, db } = require('../../config/firebase'); // Importamos admin y db desde firebase.js
const axios = require('axios');
const router = express.Router();

// Aquí debes poner la API Key de tu proyecto Firebase
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

/**
 * @swagger
 * /register:
 *   post:
 *     tags: [login]
 *     summary: Registra un nuevo usuario en Firebase Authentication y guarda datos en Firestore.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - apellido
 *               - correo
 *               - password
 *               - fecha_nacimiento
 *               - direccion
 *               - id_comuna
 *               - id_genero  # Mantener como obligatorio si es necesario
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: El nombre del usuario.
 *                 example: "Juan"
 *               apellido:
 *                 type: string
 *                 description: El apellido del usuario.
 *                 example: "Pérez"
 *               correo:
 *                 type: string
 *                 description: El correo electrónico del usuario.
 *                 example: "juan.perez@example.com"
 *               password:
 *                 type: string
 *                 description: La contraseña del usuario.
 *                 example: "password123"
 *               fecha_nacimiento:
 *                 type: string
 *                 format: date
 *                 description: La fecha de nacimiento del usuario en formato YYYY-MM-DD.
 *                 example: "1990-05-15"
 *               numero_telefono:
 *                 type: string
 *                 description: El número de teléfono del usuario. (Opcional)
 *                 example: "123456789"
 *               rut:
 *                 type: string
 *                 description: El RUT o identificación del usuario. (Opcional)
 *                 example: "12345678-9"
 *               direccion:
 *                 type: string
 *                 description: La dirección del usuario.
 *                 example: "Calle Falsa 123"
 *               id_comuna:
 *                 type: string
 *                 description: El ID de la comuna a la que pertenece el usuario.
 *                 example: "0uitcldou0fT6sADzScd"
 *               tipo_usuario:
 *                 type: number
 *                 description: Tipo de usuario. 1 = Usuario estándar, 2 = Admin, 3 = Funcionario
 *                 example: 1
 *               id_genero:
 *                 type: string
 *                 description: El ID del género del usuario.
 *                 example: "TZfnq567GbsAj9VcCFqt" 
 *               id_municipalidad:
 *                 type: string
 *                 description: El ID de la municipalidad del usuario (solo en caso de ser funcionario).
 *                 example: "jLk6tks6WFngFWQ1Zf8B" 
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente.
 *       400:
 *         description: Error en la validación de los campos requeridos.
 *       500:
 *         description: Error al registrar el usuario.
 */
router.post('/register', async (req, res) => {
  const {
    nombre,
    apellido,
    correo,
    password,
    fecha_nacimiento,
    numero_telefono,
    rut,
    direccion,
    id_comuna,
    tipo_usuario,
    id_genero,
    id_municipalidad,
  } = req.body;

  // Validación de campos obligatorios
  if (!nombre || !apellido || !correo || !password || !fecha_nacimiento || !direccion || !id_comuna || !id_genero) {
    return res.status(400).json({
      message:
        "Los campos 'nombre', 'apellido', 'correo', 'password', 'fecha_nacimiento', 'direccion', 'id_comuna' e 'id_genero' son obligatorios.",
    });
  }

  let uid = 0;

  try {
    // Crear el usuario en Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: correo,
      password: password,
    });

    uid = userRecord.uid;
  } catch (error) {
    console.error('Error al registrar el usuario:', error);
    return res.status(200).json({
      message: 'Error al registrar : Correo duplicado',
      error: error.message,
    });
  }

  try {
    // Guardar el perfil del usuario en la colección PERSONA
    await db.collection('PERSONA').doc(uid).set({
      nombre: nombre,
      apellido: apellido,
      correo: correo,
      numero_telefono: numero_telefono || null,
      rut: rut || null,
      fecha_nacimiento: fecha_nacimiento, // Añadir el campo fecha de nacimiento
      direccion: direccion, // Añadir el campo dirección
      id_comuna: id_comuna, // Añadir el campo id_comuna
      id_genero: id_genero, // Añadir el campo id_genero
      id_persona: uid, // El UID de Firebase Authentication
      id_municipalidad: id_municipalidad || null,
    });

    // Asignar tipo de usuario basado en el valor recibido
    let tipoUsuarioAsignado = null;
    if (tipo_usuario === 1) {
      tipoUsuarioAsignado = 'kwLQngxZFsGKG3a3K1xO'; // Usuario estándar
    } else if (tipo_usuario === 2) {
      tipoUsuarioAsignado = 'A0oH8hs2ZQzkcoAmiAR4'; // Admin
    } else if (tipo_usuario === 3) {
      tipoUsuarioAsignado = 'i2uxd503bDQo9OrcCZFP'; // Funcionario
    }

    // Guardar en la colección PERFIL
    await db.collection('PERFIL').doc(uid).set({
      correo: correo,
      password: password,
      imagen_usuario: null, // Inicializado como null
      tipo_usuario: tipoUsuarioAsignado, // Asignar el tipo de usuario correspondiente
      id_persona: uid, // Relacionar el UID con PERSONA
      nombre_usuario: null, // Inicializado como null
      estado: true,
    });

    // Generar un nuevo ID para el mensaje
    const id_mensaje = db.collection('MENSAJE').doc().id;

    // Guardar en la colección MENSAJE
    const mensaje = `¡Ayuda! ${nombre} ${apellido} está siendo acosada(o) y necesita asistencia inmediata.`;

    await db.collection('MENSAJE').doc(id_mensaje).set({
      id_mensaje: id_mensaje,
      id_persona: uid,
      mensaje: mensaje,
    });

    // Obtener los datos de PERSONA y PERFIL para la respuesta
    const persona = await db.collection('PERSONA').doc(uid).get();
    const perfil = await db.collection('PERFIL').doc(uid).get();

    // Respuesta exitosa con datos adicionales
    return res.status(201).json({
      message: 'Usuario registrado exitosamente.',
      uid: uid,
      persona: persona.exists ? persona.data() : null,
      perfil: perfil.exists ? perfil.data() : null,
    });
  } catch (error) {
    console.error('Error al registrar el usuario:', error);
    return res.status(500).json({
      message:
        'Error al registrar el usuario, fallo del sistema, contactar con soporte técnico',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /comunas:
 *   get:
 *     tags: [login]
 *     summary: Obtiene todas las comunas de la colección COMUNA.
 *     responses:
 *       200:
 *         description: Lista de todas las comunas.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: El ID de la comuna.
 *                     example: "0uitcldou0fT6sADzScd"
 *                   nombre:
 *                     type: string
 *                     description: Nombre de la comuna.
 *                     example: "Santiago"
 *       500:
 *         description: Error al obtener las comunas.
 */
router.get('/comunas', async (req, res) => {
  try {
    // Obtener documentos donde estado es true
    const comunasSnapshot = await db.collection('COMUNA').where('estado', '==', true).get(); 
    if (comunasSnapshot.empty) {
      return res.status(404).json({ message: 'No se encontraron comunas con estado true' });
    }

    const comunas = [];
    comunasSnapshot.forEach((doc) => {
      comunas.push({ id: doc.id, ...doc.data() }); 
    });

    return res.status(200).json(comunas); 
  } catch (error) {
    console.error('Error al obtener las comunas:', error);
    return res.status(500).json({ message: 'Error al obtener las comunas', error });
  }
});

/**
 * @swagger
 * /generos:
 *   get:
 *     tags: [login]
 *     summary: Obtiene todos los géneros de la colección GENERO.
 *     responses:
 *       200:
 *         description: Lista de todos los géneros.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: El ID del género.
 *                     example: "TZfnq567GbsAj9VcCFqt"
 *                   nombre:
 *                     type: string
 *                     description: Nombre del género.
 *                     example: "Masculino"
 *       500:
 *         description: Error al obtener los géneros.
 */
router.get('/generos', async (req, res) => {
  try {
    // Obtener documentos donde estado es true
    const generosSnapshot = await db.collection('GENERO').where('estado', '==', true).get();
    if (generosSnapshot.empty) {
      return res.status(404).json({ message: 'No se encontraron géneros con estado true' });
    }

    const generos = [];
    generosSnapshot.forEach((doc) => {
      generos.push({ id: doc.id, ...doc.data() });
    });

    return res.status(200).json(generos);
  } catch (error) {
    console.error('Error al obtener los géneros:', error);
    return res.status(500).json({ message: 'Error al obtener los géneros', error });
  }
});

/**
 * @swagger
 * /api/municipalidades:
 *   get:
 *     summary: Obtiene todas las municipalidades.
 *     tags: [login]
 *     description: Retorna una lista de todas las municipalidades con sus respectivos campos.
 *     responses:
 *       200:
 *         description: Lista de municipalidades obtenida exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 municipalidades:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_municipalidad:
 *                         type: string
 *                         description: ID de la municipalidad.
 *                       nombre_municipalidad:
 *                         type: string
 *                         description: Nombre de la municipalidad.
 *                       direccion_municipalidad:
 *                         type: string
 *                         description: Dirección de la municipalidad.
 *                       id_comuna:
 *                         type: string
 *                         description: ID de la comuna asociada a la municipalidad.
 *       500:
 *         description: Error interno al obtener las municipalidades.
 */
router.get('/municipalidades', async (req, res) => {
  try {
    // Obtener documentos donde estado es true
    const snapshot = await db.collection('MUNICIPALIDAD').where('estado', '==', true).get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No se encontraron municipalidades con estado true' });
    }

    const municipalidades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return res.status(200).json({ municipalidades });
  } catch (error) {
    console.error('Error al obtener las municipalidades:', error);
    return res.status(500).json({ message: 'Error al obtener las municipalidades', error: error.message });
  }
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Autentica al usuario con email y contraseña.
 *     tags: [login]
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
router.post('/login', async (req, res) => {
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

    // Verificar si el documento de la persona y perfil existen
    if (!personaDoc.exists || !perfilDoc.exists) {
      return res.status(404).json({
        message: 'No se encontraron los datos del usuario en las colecciones PERSONA o PERFIL.',
      });
    }

    const perfilData = perfilDoc.data();

    // Verificar si el estado del usuario en la colección PERFIL es `true`
    if (perfilData.estado === false) {
      return res.status(403).json({
        message: 'El usuario tiene restringido el acceso a la plataforma.',
      });
    }

    // Si el estado es `true`, devolver los datos combinados de PERSONA y PERFIL
    return res.status(200).json({
      message: 'Sesión iniciada exitosamente.',
      persona: personaDoc.data(),
      perfil: perfilData,
    });

  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    return res.status(500).json({
      message: 'Error al iniciar sesión.',
      error: error.response ? error.response.data.error.message : error.message,
    });
  }
});

module.exports = router;
