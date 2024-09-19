const express = require('express');
const morgan = require('morgan');
const cors = require('cors'); 
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();

// Habilitar CORS
app.use(cors());

// Middlewares
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "API Women Security App",
      version: "1.0.0",
      description: "Documentación de la API"
    },
    servers: [
      {
        url: "https://api-women-security-app-544496114867.southamerica-west1.run.app",
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Ajustar la ruta para que coincida con la estructura actual
};


const swaggerDocs = swaggerJsDoc(swaggerOptions);
console.log(JSON.stringify(swaggerDocs, null, 2));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Importar rutas
const loginRoutes = require('./routes/login.js');
const datos_usuarioRoutes = require('./routes/datos_usuario.js');
const alertaRoutes = require('./routes/alerta.js');
const gestionar_clavesRoutes = require('./routes/gestionar_claves.js');
const grupoRoutes = require('./routes/grupo.js');

app.use('/api', loginRoutes);  // Rutas del archivo login.js
app.use('/api', datos_usuarioRoutes);  // Rutas del archivo usuarios.js
app.use('/api', alertaRoutes);
app.use('/api', gestionar_clavesRoutes);
app.use('/api', grupoRoutes);

// Puerto del servidor
app.set('port', process.env.PORT || 3000);

module.exports = app;
