
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAwa6WrMidvyJASnIZfm-iA1iIMbJg9XvE",
  authDomain: "dashboard-finanza.firebaseapp.com",
  projectId: "dashboard-finanza",
  storageBucket: "dashboard-finanza.firebasestorage.app",
  messagingSenderId: "178473334205",
  appId: "1:178473334205:web:92c3c0b393bc57fc098ed4"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Inicializar servicios
const auth = firebase.auth();
const db = firebase.firestore();

// Configurar persistencia de sesión
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
        console.log("Persistencia de autenticación configurada");
    })
    .catch((error) => {
        console.error("Error configurando persistencia:", error);
    });

// Hacer las variables disponibles globalmente
window.firebaseAuth = auth;
window.firebaseDb = db;