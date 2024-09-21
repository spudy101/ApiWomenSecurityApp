const express = require('express');
const { db } = require('../../config/firebase'); // Asegúrate de tener acceso a Firestore a través de `db`
const router = express.Router();

/**
 * @swagger
 * /ver-comunas:
 *   get:
 *     tags: [admin_comuna]
 *     summary: Lista todas las comunas.
 *     description: Obtiene una lista de todas las comunas, verificando que el campo 'estado' exista.
 *     responses:
 *       200:
 *         description: Lista de comunas obtenida exitosamente.
 *       500:
 *         description: Error al obtener la lista de comunas.
 */
router.get('/ver-comunas', async (req, res) => {
    try {
        const comunasSnapshot = await db.collection('COMUNA').get();

        if (comunasSnapshot.empty) {
            return res.status(404).json({
                message: "No se encontraron comunas registradas."
            });
        }

        // Crear una lista de comunas
        const comunas = comunasSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        return res.status(200).json({
            message: "Lista de comunas obtenida exitosamente.",
            comunas
        });
    } catch (error) {
        console.error("Error al obtener la lista de comunas:", error);
        return res.status(500).json({
            message: "Error al obtener la lista de comunas.",
            error: error.message
        });
    }
});

/**
 * @swagger
 * /agregar-comuna:
 *   post:
 *     tags: [admin_comuna]
 *     summary: Agrega una nueva comuna.
 *     description: Crea un nuevo registro de comuna.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre de la comuna.
 *     responses:
 *       201:
 *         description: Comuna agregada exitosamente.
 *       500:
 *         description: Error al agregar la comuna.
 */
router.post('/agregar-comuna', async (req, res) => {
    const { nombre } = req.body;

    if (!nombre) {
        return res.status(400).json({
            message: "El campo 'nombre' es obligatorio."
        });
    }

    try {
        const nuevaComunaRef = db.collection('COMUNA').doc();
        const id_comuna = nuevaComunaRef.id;

        const nuevaComuna = {
            id_comuna,
            nombre,
            estado: true, // Se agrega la columna estado con el valor predeterminado
        };

        await nuevaComunaRef.set(nuevaComuna);

        return res.status(201).json({
            message: "Comuna agregada exitosamente.",
            comuna: nuevaComuna
        });
    } catch (error) {
        console.error("Error al agregar la comuna:", error);
        return res.status(500).json({
            message: "Error al agregar la comuna.",
            error: error.message
        });
    }
});

/**
 * @swagger
 * /editar-comuna:
 *   put:
 *     tags: [admin_comuna]
 *     summary: Edita los datos de una comuna.
 *     description: Actualiza los datos de una comuna existente.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_comuna
 *               - nombre
 *             properties:
 *               id_comuna:
 *                 type: string
 *                 description: ID de la comuna a editar.
 *               nombre:
 *                 type: string
 *                 description: Nuevo nombre de la comuna.
 *     responses:
 *       200:
 *         description: Comuna actualizada exitosamente.
 *       404:
 *         description: No se encontró la comuna.
 *       500:
 *         description: Error al actualizar la comuna.
 */
router.put('/editar-comuna', async (req, res) => {
    const { id_comuna, nombre } = req.body;

    if (!id_comuna || !nombre) {
        return res.status(400).json({
            message: "Los campos 'id_comuna' y 'nombre' son obligatorios."
        });
    }

    try {
        const comunaRef = db.collection('COMUNA').doc(id_comuna);
        const comunaDoc = await comunaRef.get();

        if (!comunaDoc.exists) {
            return res.status(404).json({
                message: `No se encontró la comuna con el id: ${id_comuna}`
            });
        }

        await comunaRef.update({ nombre });

        return res.status(200).json({
            message: "Comuna actualizada exitosamente."
        });
    } catch (error) {
        console.error("Error al actualizar la comuna:", error);
        return res.status(500).json({
            message: "Error al actualizar la comuna.",
            error: error.message
        });
    }
});

/**
 * @swagger
 * /cambiar-estado-comuna:
 *   patch:
 *     tags: [admin_comuna]
 *     summary: Cambia el estado de una comuna.
 *     description: Cambia el estado de una comuna existente (activo/inactivo).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_comuna
 *               - estado
 *             properties:
 *               id_comuna:
 *                 type: string
 *                 description: ID de la comuna a cambiar de estado.
 *               estado:
 *                 type: boolean
 *                 description: Nuevo estado de la comuna (true para activo, false para inactivo).
 *     responses:
 *       200:
 *         description: Estado de la comuna cambiado exitosamente.
 *       404:
 *         description: No se encontró la comuna.
 *       500:
 *         description: Error al cambiar el estado de la comuna.
 */
router.patch('/cambiar-estado-comuna', async (req, res) => {
    const { id_comuna, estado } = req.body;

    if (id_comuna === undefined || estado === undefined) {
        return res.status(400).json({
            message: "Los campos 'id_comuna' y 'estado' son obligatorios."
        });
    }

    try {
        const comunaRef = db.collection('COMUNA').doc(id_comuna);
        const comunaDoc = await comunaRef.get();

        if (!comunaDoc.exists) {
            return res.status(404).json({
                message: `No se encontró la comuna con el id: ${id_comuna}`
            });
        }

        await comunaRef.update({ estado });

        return res.status(200).json({
            message: "Estado de la comuna cambiado exitosamente."
        });
    } catch (error) {
        console.error("Error al cambiar el estado de la comuna:", error);
        return res.status(500).json({
            message: "Error al cambiar el estado de la comuna.",
            error: error.message
        });
    }
});

module.exports = router;
