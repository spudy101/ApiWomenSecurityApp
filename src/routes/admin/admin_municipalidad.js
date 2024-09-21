const express = require('express');
const { db } = require('../../config/firebase'); // Asegúrate de tener acceso a Firestore a través de `db`
const router = express.Router();

/**
 * @swagger
 * /agregar-municipalidad:
 *   post:
 *     tags: [municipalidad]
 *     summary: Agrega una nueva municipalidad.
 *     description: Crea un nuevo registro de municipalidad con su nombre, dirección y comuna.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre_municipalidad
 *               - direccion_municipalidad
 *               - id_comuna
 *             properties:
 *               nombre_municipalidad:
 *                 type: string
 *                 description: Nombre de la municipalidad.
 *                 example: "Municipalidad de La Florida"
 *               direccion_municipalidad:
 *                 type: string
 *                 description: Dirección de la municipalidad.
 *                 example: "Av. Vicuña Mackenna 1000, La Florida, Región Metropolitana"
 *               id_comuna:
 *                 type: string
 *                 description: ID de la comuna asociada.
 *                 example: "0OwwYi6vX3vdeGeXr0fp"
 *     responses:
 *       201:
 *         description: Municipalidad agregada exitosamente.
 *       500:
 *         description: Error al agregar la municipalidad.
 */
router.post('/agregar-municipalidad', async (req, res) => {
    const { nombre_municipalidad, direccion_municipalidad, id_comuna } = req.body;
  
    if (!nombre_municipalidad || !direccion_municipalidad || !id_comuna) {
      return res.status(400).json({
        message: "Los campos 'nombre_municipalidad', 'direccion_municipalidad' y 'id_comuna' son obligatorios."
      });
    }
  
    try {
      const nuevaMunicipalidadRef = db.collection('MUNICIPALIDAD').doc();
      const id_municipalidad = nuevaMunicipalidadRef.id;
  
      const nuevaMunicipalidad = {
        id_municipalidad,
        nombre_municipalidad,
        direccion_municipalidad,
        id_comuna,
        estado: true // La municipalidad se crea activa por defecto
      };
  
      await nuevaMunicipalidadRef.set(nuevaMunicipalidad);
  
      return res.status(201).json({
        message: "Municipalidad agregada exitosamente.",
        municipalidad: nuevaMunicipalidad
      });
    } catch (error) {
      console.error("Error al agregar la municipalidad:", error);
      return res.status(500).json({
        message: "Error al agregar la municipalidad.",
        error: error.message
      });
    }
  });
  
/**
 * @swagger
 * /editar-municipalidad:
 *   put:
 *     tags: [municipalidad]
 *     summary: Edita los datos de una municipalidad.
 *     description: Actualiza el nombre, dirección y comuna de una municipalidad.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_municipalidad
 *               - nombre_municipalidad
 *               - direccion_municipalidad
 *               - id_comuna
 *             properties:
 *               id_municipalidad:
 *                 type: string
 *                 description: ID de la municipalidad a editar.
 *                 example: "jLk6tks6WFngFWQ1Zf8B"
 *               nombre_municipalidad:
 *                 type: string
 *                 description: Nuevo nombre de la municipalidad.
 *                 example: "Municipalidad de La Florida"
 *               direccion_municipalidad:
 *                 type: string
 *                 description: Nueva dirección de la municipalidad.
 *                 example: "Av. Vicuña Mackenna 1000, La Florida, Región Metropolitana"
 *               id_comuna:
 *                 type: string
 *                 description: Nuevo ID de la comuna asociada.
 *                 example: "3iXyGJxoEJLKuuapUp2eK"
 *     responses:
 *       200:
 *         description: Municipalidad actualizada exitosamente.
 *       404:
 *         description: No se encontró la municipalidad.
 *       500:
 *         description: Error al actualizar la municipalidad.
 */
router.put('/editar-municipalidad', async (req, res) => {
    const { id_municipalidad, nombre_municipalidad, direccion_municipalidad, id_comuna } = req.body;
  
    if (!id_municipalidad || !nombre_municipalidad || !direccion_municipalidad || !id_comuna) {
      return res.status(400).json({
        message: "Los campos 'id_municipalidad', 'nombre_municipalidad', 'direccion_municipalidad' y 'id_comuna' son obligatorios."
      });
    }
  
    try {
      const municipalidadRef = db.collection('MUNICIPALIDAD').doc(id_municipalidad);
      const municipalidadDoc = await municipalidadRef.get();
  
      if (!municipalidadDoc.exists) {
        return res.status(404).json({
          message: `No se encontró la municipalidad con el id: ${id_municipalidad}`
        });
      }
  
      await municipalidadRef.update({ nombre_municipalidad, direccion_municipalidad, id_comuna });
  
      return res.status(200).json({
        message: "Municipalidad actualizada exitosamente."
      });
    } catch (error) {
      console.error("Error al actualizar la municipalidad:", error);
      return res.status(500).json({
        message: "Error al actualizar la municipalidad.",
        error: error.message
      });
    }
  });

/**
 * @swagger
 * /ver-municipalidades:
 *   get:
 *     tags: [municipalidad]
 *     summary: Lista todas las municipalidades.
 *     description: Obtiene una lista de todas las municipalidades registradas.
 *     responses:
 *       200:
 *         description: Lista de municipalidades obtenida exitosamente.
 *       500:
 *         description: Error al obtener la lista de municipalidades.
 */
router.get('/ver-municipalidades', async (req, res) => {
    try {
      const municipalidadesSnapshot = await db.collection('MUNICIPALIDAD').get();
  
      if (municipalidadesSnapshot.empty) {
        return res.status(404).json({
          message: "No se encontraron municipalidades registradas."
        });
      }
  
      const municipalidades = [];
      municipalidadesSnapshot.forEach(doc => {
        municipalidades.push(doc.data());
      });
  
      return res.status(200).json({
        message: "Lista de municipalidades obtenida exitosamente.",
        municipalidades
      });
    } catch (error) {
      console.error("Error al obtener la lista de municipalidades:", error);
      return res.status(500).json({
        message: "Error al obtener la lista de municipalidades.",
        error: error.message
      });
    }
  });

/**
 * @swagger
 * /cambiar-estado-municipalidad:
 *   put:
 *     tags: [municipalidad]
 *     summary: Cambia el estado de una municipalidad.
 *     description: Activa o desactiva una municipalidad mediante el ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_municipalidad
 *               - estado
 *             properties:
 *               id_municipalidad:
 *                 type: string
 *                 description: ID de la municipalidad.
 *                 example: "jLk6tks6WFngFWQ1Zf8B"
 *               estado:
 *                 type: boolean
 *                 description: Nuevo estado de la municipalidad (true o false).
 *                 example: false
 *     responses:
 *       200:
 *         description: Estado de la municipalidad actualizado exitosamente.
 *       404:
 *         description: No se encontró la municipalidad.
 *       500:
 *         description: Error al actualizar el estado de la municipalidad.
 */
router.put('/cambiar-estado-municipalidad', async (req, res) => {
    const { id_municipalidad, estado } = req.body;
  
    if (!id_municipalidad || estado === undefined) {
      return res.status(400).json({
        message: "Los campos 'id_municipalidad' y 'estado' son obligatorios."
      });
    }
  
    try {
      const municipalidadRef = db.collection('MUNICIPALIDAD').doc(id_municipalidad);
      const municipalidadDoc = await municipalidadRef.get();
  
      if (!municipalidadDoc.exists) {
        return res.status(404).json({
          message: `No se encontró la municipalidad con el id: ${id_municipalidad}`
        });
      }
  
      await municipalidadRef.update({ estado });
  
      return res.status(200).json({
        message: "Estado de la municipalidad actualizado exitosamente."
      });
    } catch (error) {
      console.error("Error al actualizar el estado de la municipalidad:", error);
      return res.status(500).json({
        message: "Error al actualizar el estado de la municipalidad.",
        error: error.message
      });
    }
  });

  
module.exports = router;