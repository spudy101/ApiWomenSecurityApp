const app = require('./app');

async function main() {
  app.listen(app.get('port'), () => {
    console.log(`Servidor corriendo en el puerto ${app.get('port')}`);
  });
}

main();
