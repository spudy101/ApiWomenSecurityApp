require('dotenv').config();
const admin = require('firebase-admin');

// Verifica que las variables de entorno se carguen correctamente
if (!process.env.FIREBASE_PRIVATE_KEY) {
  throw new Error('FIREBASE_PRIVATE_KEY no está definida. Verifica tu archivo .env');
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Reemplazar los saltos de línea
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
  storageBucket: 'women-security-app-31986.appspot.com', // Cambia esto por tu bucket real
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = { admin, db, bucket };
