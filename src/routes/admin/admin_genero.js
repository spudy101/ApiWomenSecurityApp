// Importaciones necesarias
const express = require('express');
const { db } = require('../../config/firebase'); // Asegúrate de que la ruta a tu configuración de Firebase sea correcta
const router = express.Router();

// Función para listar los géneros
/**
 * @swagger
 * /api/ver-generos:
 *   get:
 *     summary: Listar todos los géneros
 *     tags: [admin_genero]
 *     responses:
 *       200:
 *         description: Lista de géneros obtenida exitosamente
 *       404:
 *         description: No se encontraron géneros registrados
 *       500:
 *         description: Error al obtener la lista de géneros
 */
router.get('/ver-generos', async (req, res) => {
    try {
        const generosSnapshot = await db.collection('GENERO').get();

        if (generosSnapshot.empty) {
            return res.status(404).json({
                message: "No se encontraron géneros registrados."
            });
        }

        const generos = generosSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        return res.status(200).json({
            message: "Lista de géneros obtenida exitosamente.",
            generos
        });
    } catch (error) {
        console.error("Error al obtener la lista de géneros:", error);
        return res.status(500).json({
            message: "Error al obtener la lista de géneros.",
            error: error.message
        });
    }
});

// Función para agregar un género
/**
 * @swagger
 * /api/agregar-genero:
 *   post:
 *     summary: Agregar un nuevo género
 *     tags: [admin_genero]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               descripcion:
 *                 type: string
 *                 description: Descripción del género
 *     responses:
 *       201:
 *         description: Género agregado exitosamente
 *       400:
 *         description: El campo 'descripcion' es obligatorio
 *       500:
 *         description: Error al agregar el género
 */
router.post('/agregar-genero', async (req, res) => {
    const { descripcion } = req.body;

    if (!descripcion) {
        return res.status(400).json({
            message: "El campo 'descripcion' es obligatorio."
        });
    }

    try {
        const nuevoGeneroRef = db.collection('GENERO').doc();
        const id_genero = nuevoGeneroRef.id;

        const nuevoGenero = {
            id_genero,
            descripcion,
            estado: true
        };

        await nuevoGeneroRef.set(nuevoGenero);

        return res.status(201).json({
            message: "Género agregado exitosamente.",
            genero: nuevoGenero
        });
    } catch (error) {
        console.error("Error al agregar el género:", error);
        return res.status(500).json({
            message: "Error al agregar el género.",
            error: error.message
        });
    }
});

// Función para editar un género
/**
 * @swagger
 * /api/editar-genero/{id}:
 *   put:
 *     summary: Editar un género existente
 *     tags: [admin_genero]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del género
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               descripcion:
 *                 type: string
 *                 description: Nueva descripción del género
 *     responses:
 *       200:
 *         description: Género editado exitosamente
 *       400:
 *         description: El campo 'descripcion' es obligatorio
 *       404:
 *         description: No se encontró el género con el id
 *       500:
 *         description: Error al editar el género
 */
router.put('/editar-genero/:id', async (req, res) => {
    const id_genero = req.params.id;
    const { descripcion } = req.body;

    if (!descripcion) {
        return res.status(400).json({
            message: "El campo 'descripcion' es obligatorio."
        });
    }

    try {
        const generoRef = db.collection('GENERO').doc(id_genero);
        const generoDoc = await generoRef.get();

        if (!generoDoc.exists) {
            return res.status(404).json({
                message: `No se encontró el género con el id: ${id_genero}`
            });
        }

        await generoRef.update({ descripcion });

        return res.status(200).json({
            message: "Género editado exitosamente."
        });
    } catch (error) {
        console.error("Error al editar el género:", error);
        return res.status(500).json({
            message: "Error al editar el género.",
            error: error.message
        });
    }
});

// Función para cambiar el estado de un género
/**
 * @swagger
 * /api/cambiar-estado-genero/{id}:
 *   put:
 *     summary: Cambiar el estado de un género
 *     tags: [admin_genero]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del género
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estado:
 *                 type: boolean
 *                 description: Nuevo estado del género
 *     responses:
 *       200:
 *         description: Estado del género actualizado exitosamente
 *       400:
 *         description: El campo 'estado' es obligatorio
 *       404:
 *         description: No se encontró el género con el id
 *       500:
 *         description: Error al cambiar el estado del género
 */
router.put('/cambiar-estado-genero/:id', async (req, res) => {
    const id_genero = req.params.id;
    const { estado } = req.body;

    if (estado === undefined) {
        return res.status(400).json({
            message: "El campo 'estado' es obligatorio."
        });
    }

    try {
        const generoRef = db.collection('GENERO').doc(id_genero);
        const generoDoc = await generoRef.get();

        if (!generoDoc.exists) {
            return res.status(404).json({
                message: `No se encontró el género con el id: ${id_genero}`
            });
        }

        await generoRef.update({ estado });

        return res.status(200).json({
            message: "Estado del género actualizado exitosamente."
        });
    } catch (error) {
        console.error("Error al cambiar el estado del género:", error);
        return res.status(500).json({
            message: "Error al cambiar el estado del género.",
            error: error.message
        });
    }
});

// Exportación del router
module.exports = router;
