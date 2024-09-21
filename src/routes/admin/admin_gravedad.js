const express = require('express');
const { db } = require('../../config/firebase');
const router = express.Router();

/**
 * @swagger
 * /agregar-gravedad:
 *   post:
 *     tags: [admin_gravedad]
 *     summary: Agrega una nueva gravedad.
 *     description: Crea un nuevo registro de gravedad con una descripción y un estado activo (true por defecto).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - descripcion
 *             properties:
 *               descripcion:
 *                 type: string
 *                 description: Descripción de la gravedad.
 *                 example: "Acoso"
 *     responses:
 *       201:
 *         description: Gravedad agregada exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Gravedad agregada exitosamente."
 *                 gravedad:
 *                   type: object
 *                   properties:
 *                     id_gravedad:
 *                       type: string
 *                       example: "L0tZzpf0ILTVtA2gzNva"
 *                     descripcion:
 *                       type: string
 *                       example: "Acoso"
 *                     estado:
 *                       type: boolean
 *                       example: true
 *       500:
 *         description: Error al agregar la gravedad.
 */
router.post('/agregar-gravedad', async (req, res) => {
    const { descripcion } = req.body;
  
    if (!descripcion) {
      return res.status(400).json({
        message: "El campo 'descripcion' es obligatorio."
      });
    }
  
    try {
      const nuevaGravedadRef = db.collection('GRAVEDAD').doc();
      const id_gravedad = nuevaGravedadRef.id;
  
      const nuevaGravedad = {
        id_gravedad,
        descripcion,
        estado: true // Agregar estado como activo por defecto
      };
  
      await nuevaGravedadRef.set(nuevaGravedad);
  
      return res.status(201).json({
        message: "Gravedad agregada exitosamente.",
        gravedad: nuevaGravedad
      });
    } catch (error) {
      console.error("Error al agregar la gravedad:", error);
      return res.status(500).json({
        message: "Error al agregar la gravedad.",
        error: error.message
      });
    }
  });
  
/**
 * @swagger
 * /editar-gravedad:
 *   put:
 *     tags: [admin_gravedad]
 *     summary: Edita los datos de una gravedad.
 *     description: Actualiza la descripción de una gravedad.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_gravedad
 *               - descripcion
 *             properties:
 *               id_gravedad:
 *                 type: string
 *                 description: ID de la gravedad a editar.
 *                 example: "L0tZzpf0ILTVtA2gzNva"
 *               descripcion:
 *                 type: string
 *                 description: Nueva descripción de la gravedad.
 *                 example: "Robo"
 *     responses:
 *       200:
 *         description: Gravedad actualizada exitosamente.
 *       404:
 *         description: No se encontró la gravedad.
 *       500:
 *         description: Error al actualizar la gravedad.
 */
router.put('/editar-gravedad', async (req, res) => {
    const { id_gravedad, descripcion } = req.body;
  
    if (!id_gravedad || !descripcion) {
      return res.status(400).json({
        message: "Los campos 'id_gravedad' y 'descripcion' son obligatorios."
      });
    }
  
    try {
      const gravedadRef = db.collection('GRAVEDAD').doc(id_gravedad);
      const gravedadDoc = await gravedadRef.get();
  
      if (!gravedadDoc.exists) {
        return res.status(404).json({
          message: `No se encontró la gravedad con el id: ${id_gravedad}`
        });
      }
  
      await gravedadRef.update({ descripcion });
  
      return res.status(200).json({
        message: "Gravedad actualizada exitosamente."
      });
    } catch (error) {
      console.error("Error al actualizar la gravedad:", error);
      return res.status(500).json({
        message: "Error al actualizar la gravedad.",
        error: error.message
      });
    }
  });

  /**
 * @swagger
 * /ver-gravedades:
 *   get:
 *     tags: [admin_gravedad]
 *     summary: Lista todas las gravedades.
 *     description: Obtiene una lista de todas las gravedades registradas.
 *     responses:
 *       200:
 *         description: Lista de gravedades obtenida exitosamente.
 *       500:
 *         description: Error al obtener la lista de gravedades.
 */
router.get('/ver-gravedades', async (req, res) => {
    try {
      const gravedadesSnapshot = await db.collection('GRAVEDAD').get();
  
      if (gravedadesSnapshot.empty) {
        return res.status(404).json({
          message: "No se encontraron gravedades registradas."
        });
      }
  
      const gravedades = [];
      gravedadesSnapshot.forEach(doc => {
        gravedades.push(doc.data());
      });
  
      return res.status(200).json({
        message: "Lista de gravedades obtenida exitosamente.",
        gravedades
      });
    } catch (error) {
      console.error("Error al obtener la lista de gravedades:", error);
      return res.status(500).json({
        message: "Error al obtener la lista de gravedades.",
        error: error.message
      });
    }
  });

/**
 * @swagger
 * /cambiar-estado-gravedad:
 *   put:
 *     tags: [admin_gravedad]
 *     summary: Cambia el estado de una gravedad.
 *     description: Activa o desactiva una gravedad mediante el ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_gravedad
 *               - estado
 *             properties:
 *               id_gravedad:
 *                 type: string
 *                 description: ID de la gravedad.
 *                 example: "L0tZzpf0ILTVtA2gzNva"
 *               estado:
 *                 type: boolean
 *                 description: Nuevo estado de la gravedad (true o false).
 *                 example: false
 *     responses:
 *       200:
 *         description: Estado de la gravedad actualizado exitosamente.
 *       404:
 *         description: No se encontró la gravedad.
 *       500:
 *         description: Error al actualizar el estado de la gravedad.
 */
router.put('/cambiar-estado-gravedad', async (req, res) => {
    const { id_gravedad, estado } = req.body;
  
    if (!id_gravedad || estado === undefined) {
      return res.status(400).json({
        message: "Los campos 'id_gravedad' y 'estado' son obligatorios."
      });
    }
  
    try {
      const gravedadRef = db.collection('GRAVEDAD').doc(id_gravedad);
      const gravedadDoc = await gravedadRef.get();
  
      if (!gravedadDoc.exists) {
        return res.status(404).json({
          message: `No se encontró la gravedad con el id: ${id_gravedad}`
        });
      }
  
      await gravedadRef.update({ estado });
  
      return res.status(200).json({
        message: "Estado de la gravedad actualizado exitosamente."
      });
    } catch (error) {
      console.error("Error al actualizar el estado de la gravedad:", error);
      return res.status(500).json({
        message: "Error al actualizar el estado de la gravedad.",
        error: error.message
      });
    }
  });

module.exports = router;