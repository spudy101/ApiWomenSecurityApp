// const admin = require('firebase-admin');
// const path = require('path');
// const serviceAccount = require(path.join(__dirname, '../firebase-config.json')); // Asegúrate de que la ruta sea correcta

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   storageBucket: 'women-security-app-31986.appspot.com', // Cambia esto por tu bucket real
// });

// const db = admin.firestore();
// const bucket = admin.storage().bucket(); // Ya no necesitas pasar el bucket aquí si está en initializeApp()

// module.exports = { admin, db, bucket };


const admin = require('firebase-admin');

// Inicializar Firebase usando las credenciales predeterminadas de Google Cloud
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  storageBucket: 'women-security-app-31986.appspot.com', // Cambia esto por tu bucket real
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = { admin, db, bucket };
