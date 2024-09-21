const express = require('express');
const { db } = require('../../config/firebase'); // Asegúrate de tener acceso a Firestore a través de `db`
const router = express.Router();

/**
 * @swagger
 * /agregar-departamento:
 *   post:
 *     tags: [admin_departamento]
 *     summary: Agrega un nuevo departamento.
 *     description: Crea un nuevo registro de departamento con su nombre y número de teléfono.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre_departamento
 *               - numero_telefono
 *             properties:
 *               nombre_departamento:
 *                 type: string
 *                 description: Nombre del departamento.
 *                 example: "Bomberos"
 *               numero_telefono:
 *                 type: string
 *                 description: Número de teléfono del departamento.
 *                 example: "123456789"
 *     responses:
 *       201:
 *         description: Departamento agregado exitosamente.
 *       500:
 *         description: Error al agregar el departamento.
 */
router.post('/agregar-departamento', async (req, res) => {
    const { nombre_departamento, numero_telefono } = req.body;
  
    if (!nombre_departamento || !numero_telefono) {
      return res.status(400).json({
        message: "Los campos 'nombre_departamento' y 'numero_telefono' son obligatorios."
      });
    }
  
    try {
      const nuevoDepartamentoRef = db.collection('DEPARTAMENTO').doc();
      const id_departamento = nuevoDepartamentoRef.id;
  
      const nuevoDepartamento = {
        id_departamento,
        nombre_departamento,
        numero_telefono,
        estado: true // El departamento se crea activo por defecto
      };
  
      await nuevoDepartamentoRef.set(nuevoDepartamento);
  
      return res.status(201).json({
        message: "Departamento agregado exitosamente.",
        departamento: nuevoDepartamento
      });
    } catch (error) {
      console.error("Error al agregar el departamento:", error);
      return res.status(500).json({
        message: "Error al agregar el departamento.",
        error: error.message
      });
    }
  });
  
/**
 * @swagger
 * /editar-departamento:
 *   put:
 *     tags: [admin_departamento]
 *     summary: Edita los datos de un departamento.
 *     description: Actualiza el nombre y número de teléfono de un departamento.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_departamento
 *               - nombre_departamento
 *               - numero_telefono
 *             properties:
 *               id_departamento:
 *                 type: string
 *                 description: ID del departamento a editar.
 *                 example: "RF1gx1AVP8zOG7WZMne5"
 *               nombre_departamento:
 *                 type: string
 *                 description: Nuevo nombre del departamento.
 *                 example: "Carabineros"
 *               numero_telefono:
 *                 type: string
 *                 description: Nuevo número de teléfono del departamento.
 *                 example: "987654321"
 *     responses:
 *       200:
 *         description: Departamento actualizado exitosamente.
 *       404:
 *         description: No se encontró el departamento.
 *       500:
 *         description: Error al actualizar el departamento.
 */
router.put('/editar-departamento', async (req, res) => {
    const { id_departamento, nombre_departamento, numero_telefono } = req.body;
  
    if (!id_departamento || !nombre_departamento || !numero_telefono) {
      return res.status(400).json({
        message: "Los campos 'id_departamento', 'nombre_departamento' y 'numero_telefono' son obligatorios."
      });
    }
  
    try {
      const departamentoRef = db.collection('DEPARTAMENTO').doc(id_departamento);
      const departamentoDoc = await departamentoRef.get();
  
      if (!departamentoDoc.exists) {
        return res.status(404).json({
          message: `No se encontró el departamento con el id: ${id_departamento}`
        });
      }
  
      await departamentoRef.update({ nombre_departamento, numero_telefono });
  
      return res.status(200).json({
        message: "Departamento actualizado exitosamente."
      });
    } catch (error) {
      console.error("Error al actualizar el departamento:", error);
      return res.status(500).json({
        message: "Error al actualizar el departamento.",
        error: error.message
      });
    }
  });

/**
 * @swagger
 * /ver-departamentos:
 *   get:
 *     tags: [admin_departamento]
 *     summary: Lista todos los departamentos.
 *     description: Obtiene una lista de todos los departamentos registrados.
 *     responses:
 *       200:
 *         description: Lista de departamentos obtenida exitosamente.
 *       500:
 *         description: Error al obtener la lista de departamentos.
 */
router.get('/ver-departamentos', async (req, res) => {
    try {
      const departamentosSnapshot = await db.collection('DEPARTAMENTO').get();
  
      if (departamentosSnapshot.empty) {
        return res.status(404).json({
          message: "No se encontraron departamentos registrados."
        });
      }
  
      const departamentos = [];
      departamentosSnapshot.forEach(doc => {
        departamentos.push(doc.data());
      });
  
      return res.status(200).json({
        message: "Lista de departamentos obtenida exitosamente.",
        departamentos
      });
    } catch (error) {
      console.error("Error al obtener la lista de departamentos:", error);
      return res.status(500).json({
        message: "Error al obtener la lista de departamentos.",
        error: error.message
      });
    }
  });

/**
 * @swagger
 * /cambiar-estado-departamento:
 *   put:
 *     tags: [admin_departamento]
 *     summary: Cambia el estado de un departamento.
 *     description: Activa o desactiva un departamento mediante el ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_departamento
 *               - estado
 *             properties:
 *               id_departamento:
 *                 type: string
 *                 description: ID del departamento.
 *                 example: "RF1gx1AVP8zOG7WZMne5"
 *               estado:
 *                 type: boolean
 *                 description: Nuevo estado del departamento (true o false).
 *                 example: false
 *     responses:
 *       200:
 *         description: Estado del departamento actualizado exitosamente.
 *       404:
 *         description: No se encontró el departamento.
 *       500:
 *         description: Error al actualizar el estado del departamento.
 */
router.put('/cambiar-estado-departamento', async (req, res) => {
    const { id_departamento, estado } = req.body;
  
    if (!id_departamento || estado === undefined) {
      return res.status(400).json({
        message: "Los campos 'id_departamento' y 'estado' son obligatorios."
      });
    }
  
    try {
      const departamentoRef = db.collection('DEPARTAMENTO').doc(id_departamento);
      const departamentoDoc = await departamentoRef.get();
  
      if (!departamentoDoc.exists) {
        return res.status(404).json({
          message: `No se encontró el departamento con el id: ${id_departamento}`
        });
      }
  
      await departamentoRef.update({ estado });
  
      return res.status(200).json({
        message: "Estado del departamento actualizado exitosamente."
      });
    } catch (error) {
      console.error("Error al actualizar el estado del departamento:", error);
      return res.status(500).json({
        message: "Error al actualizar el estado del departamento.",
        error: error.message
      });
    }
  });
    

module.exports = router;