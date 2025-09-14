// Gestión de autenticación de usuarios
class AuthManager {
    // Enviar email de recuperación de contraseña
    async sendPasswordReset(email) {
        try {
            await this.auth.sendPasswordResetEmail(email);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    constructor() {
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.currentUser = null;
        this.userData = null;
    }

    // Verificar estado de autenticación
    initAuthStateListener() {
        this.auth.onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.handleUserLoggedIn(user);
            } else {
                this.handleUserLoggedOut();
            }
        });
    }

    // En auth.js, modifica la función handleUserLoggedIn
    async handleUserLoggedIn(user) {
        // Ocultar modales de auth y mostrar app
        UI.hideAuthModals();
        UI.showApp();

        // Establecer usuario en dbManager y debtCreditManager
        dbManager.setCurrentUser(user);
        if (window.debtCreditManager && typeof window.debtCreditManager.setCurrentUser === 'function') {
            window.debtCreditManager.setCurrentUser(user);
            if (typeof window.debtCreditManager.loadAndRender === 'function') {
                window.debtCreditManager.loadAndRender();
            }
        }

        // Cargar datos del usuario
        this.userData = await this.loadUserData(user.uid);

        if (this.userData) {
            // Actualizar la interfaz con los datos del usuario
            UI.updateUserProfile(this.userData);

            // Inicializar la aplicación
            App.init();
        }
    }

    // Manejar cierre de sesión
    handleUserLoggedOut() {
        this.currentUser = null;
        this.userData = null;
        UI.showLoginModal();
        UI.hideApp();
    }

    // Iniciar sesión con email y contraseña
    async loginUser(email, password) {
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Registrar nuevo usuario
    async registerUser(email, password, extraData = {}) {
        try {
            // Crear usuario en Authentication
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Guardar información adicional en Firestore solo si se recibe
            const userData = {
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                currency: 'USD',
                ...extraData
            };
            await this.db.collection('users').doc(user.uid).set(userData);

            return { success: true, user: user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Cerrar sesión
    async logoutUser() {
        try {
            await this.auth.signOut();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Cargar datos del usuario desde Firestore
    async loadUserData(userId) {
        try {
            const userDoc = await this.db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                return userDoc.data();
            }
            return null;
        } catch (error) {
            console.error('Error cargando datos del usuario:', error);
            return null;
        }
    }

    // Obtener usuario actual
    getCurrentUser() {
        return this.currentUser;
    }

    // Obtener datos del usuario
    getUserData() {
        return this.userData;
    }
}

// Instancia global del administrador de autenticación
const authManager = new AuthManager();