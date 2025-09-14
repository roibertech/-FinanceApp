// Gestión de base de datos para finanzas
// Gestión de base de datos para finanzas
class DatabaseManager {
    // Eliminar una transacción
    async deleteTransaction(transactionId) {
        try {
            const userId = this.checkAuth();
            // Obtener la transacción a eliminar
            const transactionDoc = await this.db.collection('transactions').doc(transactionId).get();
            if (!transactionDoc.exists) {
                return { success: false, error: 'Transacción no encontrada' };
            }
            const transaction = transactionDoc.data();
            // Eliminar la transacción
            await this.db.collection('transactions').doc(transactionId).delete();

            // Actualizar balances según el tipo de transacción eliminada
            let updates = {};
            if (transaction.type === 'income') {
                updates = {
                    totalBalance: this.finances.totalBalance - transaction.amount,
                    monthlyIncome: this.finances.monthlyIncome - transaction.amount
                };
            } else if (transaction.type === 'expense') {
                updates = {
                    totalBalance: this.finances.totalBalance + transaction.amount,
                    monthlyExpenses: this.finances.monthlyExpenses - transaction.amount
                };
            } else if (transaction.type === 'savings') {
                updates = {
                    totalBalance: this.finances.totalBalance + transaction.amount,
                    totalSavings: this.finances.totalSavings - transaction.amount
                };
            }
            await this.updateFinances(updates);
            return { success: true };
        } catch (error) {
            console.error('Error eliminando transacción:', error);
            return { success: false, error: error.message };
        }
    }
    constructor() {
        this.db = firebase.firestore();
        this.currentUser = null;
        this.finances = {
            totalBalance: 0,
            monthlyExpenses: 0,
            monthlyIncome: 0,
            totalSavings: 0
        };
    }

    // Establecer usuario actual
    setCurrentUser(user) {
        this.currentUser = user;
    }

    // Verificar si el usuario está autenticado
    checkAuth() {
        if (!this.currentUser) {
            throw new Error('Usuario no autenticado');
        }
        return this.currentUser.uid;
    }

    // Inicializar datos financieros para un nuevo usuario
    async initializeUserFinances() {
        try {
            const userId = this.checkAuth();
            await this.db.collection('finances').doc(userId).set({
                totalBalance: 0,
                monthlyExpenses: 0,
                monthlyIncome: 0,
                totalSavings: 0,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error inicializando finanzas:', error);
            return false;
        }
    }

    // Cargar datos financieros del usuario
    async loadUserFinances() {
        try {
            const userId = this.checkAuth();
            const financesDoc = await this.db.collection('finances').doc(userId).get();
            
            if (financesDoc.exists) {
                this.finances = financesDoc.data();
                return this.finances;
            } else {
                // Si no existe, crear registro inicial
                await this.initializeUserFinances();
                return this.finances;
            }
        } catch (error) {
            console.error('Error cargando finanzas:', error);
            return null;
        }
    }

    // Actualizar datos financieros en la base de datos
    async updateFinances(updates) {
        try {
            const userId = this.checkAuth();
            updates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            await this.db.collection('finances').doc(userId).update(updates);
            
            // Actualizar localmente
            Object.assign(this.finances, updates);
            return true;
        } catch (error) {
            console.error('Error actualizando finanzas:', error);
            return false;
        }
    }

    // Agregar una transacción
    async addTransaction(transaction) {
        try {
            const userId = this.checkAuth();
            
            // Agregar timestamp y userId
            transaction.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            transaction.userId = userId;
            
            // Agregar a la colección de transacciones
            const transactionRef = await this.db.collection('transactions').add(transaction);
            
            // Actualizar finanzas según el tipo de transacción
            let updates = {};
            
            if (transaction.type === 'income') {
                updates = {
                    totalBalance: this.finances.totalBalance + transaction.amount,
                    monthlyIncome: this.finances.monthlyIncome + transaction.amount
                };
            } else if (transaction.type === 'expense') {
                updates = {
                    totalBalance: this.finances.totalBalance - transaction.amount,
                    monthlyExpenses: this.finances.monthlyExpenses + transaction.amount
                };
            } else if (transaction.type === 'savings') {
                updates = {
                    totalBalance: this.finances.totalBalance - transaction.amount,
                    totalSavings: this.finances.totalSavings + transaction.amount
                };
            }
            
            // Actualizar finanzas
            await this.updateFinances(updates);
            
            return { success: true, id: transactionRef.id };
        } catch (error) {
            console.error('Error agregando transacción:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener transacciones recientes (VERSIÓN TEMPORAL)
    async getRecentTransactions(limit = 10) {
        try {
            const userId = this.checkAuth();
            
            // SOLUCIÓN TEMPORAL: Obtener todas las transacciones y filtrar localmente
            const snapshot = await this.db.collection('transactions')
                .where('userId', '==', userId)
                .get();
            
            const transactions = [];
            snapshot.forEach(doc => {
                transactions.push({ id: doc.id, ...doc.data() });
            });
            
            // Ordenar localmente por fecha de creación
            transactions.sort((a, b) => {
                const dateA = a.createdAt ? a.createdAt.toDate().getTime() : 0;
                const dateB = b.createdAt ? b.createdAt.toDate().getTime() : 0;
                return dateB - dateA;
            });
            
            return transactions.slice(0, limit);
        } catch (error) {
            console.error('Error obteniendo transacciones:', error);
            return [];
        }
    }

    // Escuchar cambios en las transacciones en tiempo real (VERSIÓN SEGURA)
    listenToTransactions(callback) {
        try {
            const userId = this.checkAuth();
            
            // Verificación robusta del callback
            if (typeof callback !== 'function') {
                console.warn('listenToTransactions: Callback no es una función, retornando unsubscribe vacío');
                return () => {}; // Retorna función vacía
            }
            
            return this.db.collection('transactions')
                .where('userId', '==', userId)
                .onSnapshot((snapshot) => {
                    const transactions = [];
                    snapshot.forEach(doc => {
                        transactions.push({ id: doc.id, ...doc.data() });
                    });
                    
                    // Ordenar localmente
                    transactions.sort((a, b) => {
                        const dateA = a.createdAt ? a.createdAt.toDate().getTime() : 0;
                        const dateB = b.createdAt ? b.createdAt.toDate().getTime() : 0;
                        return dateB - dateA;
                    });
                    
                    // Ejecutar callback con protección
                    try {
                        callback(transactions);
                    } catch (error) {
                        console.error('Error ejecutando callback de transacciones:', error);
                    }
                }, (error) => {
                    console.error('Error en snapshot de transacciones:', error);
                });
        } catch (error) {
            console.error('Error configurando listener de transacciones:', error);
            return () => {}; // Función vacía para unsubscribe
        }
    }

    // Escuchar cambios en las finanzas en tiempo real
    listenToFinances(callback) {
        try {
            const userId = this.checkAuth();
            
            if (typeof callback !== 'function') {
                console.warn('listenToFinances: Callback no es una función');
                return () => {};
            }
            
            return this.db.collection('finances').doc(userId)
                .onSnapshot((doc) => {
                    if (doc.exists) {
                        this.finances = doc.data();
                        try {
                            callback(this.finances);
                        } catch (error) {
                            console.error('Error ejecutando callback de finanzas:', error);
                        }
                    }
                }, (error) => {
                    console.error('Error en listener de finanzas:', error);
                });
        } catch (error) {
            console.error('Error configurando listener de finanzas:', error);
            return () => {};
        }
    }

    // Obtener finanzas actuales
    getCurrentFinances() {
        return this.finances;
    }
}

// Instancia global del administrador de base de datos
const dbManager = new DatabaseManager();