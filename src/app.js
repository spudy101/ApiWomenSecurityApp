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
  apis: ['./src/routes/usuario/*.js', './src/routes/funcionario/*.js', './src/routes/admin/*.js'],// Ajustar la ruta para que coincida con la estructura actual
};


const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Importar rutas
const loginRoutes = require('./routes/usuario/login.js');
const datos_usuarioRoutes = require('./routes/usuario/datos_usuario.js');
const alertaRoutes = require('./routes/usuario/alerta.js');
const gestionar_clavesRoutes = require('./routes/usuario/gestionar_claves.js');
const grupoRoutes = require('./routes/usuario/grupo.js');
const metricasRoutes = require('./routes/funcionario/metricas.js');
const derivar_alertasRoutes = require('./routes/funcionario/derivar_alertas.js');
const admin_gravedadRoutes = require('./routes/admin/admin_gravedad.js');
const admin_usuariosRoutes = require('./routes/admin/admin_usuario.js');
const admin_municipalidadRoutes = require('./routes/admin/admin_municipalidad.js');
const admin_departamentoRoutes = require('./routes/admin/admin_departamento.js');
const admin_comunaRoutes = require('./routes/admin/admin_comuna.js');
const admin_generoRoutes = require('./routes/admin/admin_genero.js');

app.use('/api', loginRoutes);  // Rutas del archivo login.js
app.use('/api', datos_usuarioRoutes);  // Rutas del archivo usuarios.js
app.use('/api', alertaRoutes);
app.use('/api', gestionar_clavesRoutes);
app.use('/api', grupoRoutes);
app.use('/api', metricasRoutes);
app.use('/api', derivar_alertasRoutes);
app.use('/api', admin_gravedadRoutes);
app.use('/api', admin_usuariosRoutes);
app.use('/api', admin_municipalidadRoutes);
app.use('/api', admin_departamentoRoutes);
app.use('/api', admin_comunaRoutes);
app.use('/api', admin_generoRoutes);

// Puerto del servidor
app.set('port', process.env.PORT || 3000);

module.exports = app;
