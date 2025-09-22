class DatabaseManager {
	// Cargar datos financieros del usuario actual desde Firestore
	async loadUserFinances() {
		try {
			const userId = this.checkAuth();
			const financesDoc = await this.db.collection('finances').doc(userId).get();
			if (financesDoc.exists) {
				this.finances = financesDoc.data();
				return this.finances;
			} else {
				// Si no existe, crear registro inicial
				await this.db.collection('finances').doc(userId).set({
					totalBalance: 0,
					monthlyExpenses: 0,
					monthlyIncome: 0,
					totalSavings: 0,
					updatedAt: firebase.firestore.FieldValue.serverTimestamp()
				});
				this.finances = {
					totalBalance: 0,
					monthlyExpenses: 0,
					monthlyIncome: 0,
					totalSavings: 0
				};
				return this.finances;
			}
		} catch (error) {
			console.error('Error cargando finanzas:', error);
			return null;
		}
	}
	// Eliminar una transacción y ajustar balances
	async deleteTransaction(transactionId) {
		try {
			const userId = this.checkAuth();
			// Obtener la transacción a eliminar
			const transactionDoc = await this.db.collection('transactions').doc(transactionId).get();
			if (!transactionDoc.exists) {
				return { success: false, error: 'Transacción no encontrada' };
			}
			const transaction = transactionDoc.data();

			// Si es exchange y tiene exchangeId, eliminar ambas transacciones y revertir saldos
			if (transaction.type === 'exchange' && transaction.exchangeId) {
				// Buscar todas las transacciones con el mismo exchangeId
				const snapshot = await this.db.collection('transactions')
					.where('exchangeId', '==', transaction.exchangeId)
					.where('userId', '==', userId)
					.get();
				let usdAmount = 0;
				let vesAmount = 0;
				let idsToDelete = [];
				snapshot.forEach(doc => {
					const tx = doc.data();
					idsToDelete.push(doc.id);
					if (tx.currency === 'USD') {
						usdAmount += tx.amount;
					} else if (tx.currency === 'VES') {
						vesAmount += tx.amount;
					}
				});
				// Eliminar ambas transacciones
				for (const id of idsToDelete) {
					await this.db.collection('transactions').doc(id).delete();
				}
				// Revertir saldos
				const updates = {
					balanceUSD: (this.finances.balanceUSD || 0) + usdAmount,
					balanceVES: (this.finances.balanceVES || 0) - vesAmount
				};
				await this.updateFinances(updates);
				return { success: true, deleted: idsToDelete };
			} else {
				// Eliminar la transacción normal
				await this.db.collection('transactions').doc(transactionId).delete();
				// Actualizar balances según el tipo de transacción eliminada
				let updates = {};
				if (transaction.type === 'income') {
					if (transaction.currency === 'USD') {
						updates = {
							totalBalance: (this.finances.totalBalance || 0) - transaction.amount,
							monthlyIncome: (this.finances.monthlyIncome || 0) - transaction.amount,
							balanceUSD: (this.finances.balanceUSD || 0) - transaction.amount
						};
					} else if (transaction.currency === 'VES') {
						updates = {
							totalBalance: (this.finances.totalBalance || 0) - transaction.amount,
							monthlyIncome: (this.finances.monthlyIncome || 0) - transaction.amount,
							balanceVES: (this.finances.balanceVES || 0) - transaction.amount
						};
					}
				} else if (transaction.type === 'expense') {
					if (transaction.currency === 'USD') {
						updates = {
							totalBalance: (this.finances.totalBalance || 0) + transaction.amount,
							monthlyExpenses: (this.finances.monthlyExpenses || 0) - transaction.amount,
							balanceUSD: (this.finances.balanceUSD || 0) + transaction.amount
						};
					} else if (transaction.currency === 'VES') {
						updates = {
							totalBalance: (this.finances.totalBalance || 0) + transaction.amount,
							monthlyExpenses: (this.finances.monthlyExpenses || 0) - transaction.amount,
							balanceVES: (this.finances.balanceVES || 0) + transaction.amount
						};
					}
				} else if (transaction.type === 'savings') {
					if (transaction.currency === 'USD') {
						updates = {
							totalBalance: (this.finances.totalBalance || 0) + transaction.amount,
							totalSavings: (this.finances.totalSavings || 0) - transaction.amount,
							balanceUSD: (this.finances.balanceUSD || 0) + transaction.amount
						};
					} else if (transaction.currency === 'VES') {
						updates = {
							totalBalance: (this.finances.totalBalance || 0) + transaction.amount,
							totalSavings: (this.finances.totalSavings || 0) - transaction.amount,
							balanceVES: (this.finances.balanceVES || 0) + transaction.amount
						};
					}
				} else if (transaction.type === 'exchange') {
					if (transaction.currency === 'USD') {
						updates = {
							balanceUSD: (this.finances.balanceUSD || 0) + transaction.amount
						};
					} else if (transaction.currency === 'VES') {
						updates = {
							balanceVES: (this.finances.balanceVES || 0) - transaction.amount
						};
					}
				}
				await this.updateFinances(updates);
				return { success: true, deleted: [transactionId] };
			}
		} catch (error) {
			console.error('Error eliminando transacción:', error);
			return { success: false, error: error.message };
		}
	}
	// Actualizar datos financieros en Firestore y localmente
	async updateFinances(updates) {
		try {
			const userId = this.checkAuth();
			updates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
			await this.db.collection('finances').doc(userId).update(updates);
			Object.assign(this.finances, updates);
			return true;
		} catch (error) {
			console.error('Error actualizando finanzas:', error);
			return false;
		}
	}
	// Agregar una transacción y actualizar balances
	async addTransaction(transaction) {
		try {
			const userId = this.checkAuth();
			// Log para verificar fecha/hora enviada a Firestore
			console.log('[LOG FIREBASE] Fecha enviada:', transaction.date, 'Hora enviada:', transaction.time, 'id:', transaction.id);
			// Mantener createdAt solo para auditoría interna, no para mostrar en historial
			transaction.createdAt = firebase.firestore.FieldValue.serverTimestamp();
			// La fecha/hora que se muestra en el historial será la seleccionada por el usuario (transaction.date y transaction.time)
			transaction.userId = userId;

			// Si es un exchange, generar un exchangeId único si no existe
			if (transaction.type === 'exchange' && !transaction.exchangeId) {
				transaction.exchangeId = 'exch_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
			}

			// Log para verificar si convertedUSD está presente
			if (transaction.type === 'expense' && transaction.currency === 'VES') {
				console.log('[DB] Registro VES:', transaction.amount, 'convertedUSD:', transaction.convertedUSD);
			}
			// Agregar a la colección de transacciones
			const transactionRef = await this.db.collection('transactions').add(transaction);

			// Actualizar balances según el tipo de transacción
			let updates = {};
			if (transaction.type === 'income') {
				if (transaction.currency === 'USD') {
					updates = {
						totalBalance: (this.finances.totalBalance || 0) + transaction.amount,
						monthlyIncome: (this.finances.monthlyIncome || 0) + transaction.amount,
						balanceUSD: (this.finances.balanceUSD || 0) + transaction.amount
					};
				} else if (transaction.currency === 'VES') {
					updates = {
						totalBalance: (this.finances.totalBalance || 0) + transaction.amount,
						monthlyIncome: (this.finances.monthlyIncome || 0) + transaction.amount,
						balanceVES: (this.finances.balanceVES || 0) + transaction.amount
					};
				}
			} else if (transaction.type === 'expense') {
				if (transaction.currency === 'USD') {
					updates = {
						totalBalance: (this.finances.totalBalance || 0) - transaction.amount,
						monthlyExpenses: (this.finances.monthlyExpenses || 0) + transaction.amount,
						balanceUSD: (this.finances.balanceUSD || 0) - transaction.amount
					};
				} else if (transaction.currency === 'VES') {
					updates = {
						totalBalance: (this.finances.totalBalance || 0) - transaction.amount,
						monthlyExpenses: (this.finances.monthlyExpenses || 0) + transaction.amount,
						balanceVES: (this.finances.balanceVES || 0) - transaction.amount
					};
				}
			} else if (transaction.type === 'savings') {
				if (transaction.currency === 'USD') {
					updates = {
						totalBalance: (this.finances.totalBalance || 0) - transaction.amount,
						totalSavings: (this.finances.totalSavings || 0) + transaction.amount,
						balanceUSD: (this.finances.balanceUSD || 0) - transaction.amount
					};
				} else if (transaction.currency === 'VES') {
					updates = {
						totalBalance: (this.finances.totalBalance || 0) - transaction.amount,
						totalSavings: (this.finances.totalSavings || 0) + transaction.amount,
						balanceVES: (this.finances.balanceVES || 0) - transaction.amount
					};
				}
			} else if (transaction.type === 'exchange') {
				// Solo afecta balances de caja, no totalBalance
				if (transaction.currency === 'USD') {
					updates = {
						balanceUSD: (this.finances.balanceUSD || 0) - transaction.amount
					};
				} else if (transaction.currency === 'VES') {
					updates = {
						balanceVES: (this.finances.balanceVES || 0) + transaction.amount
					};
				}
				// No modificar totalBalance
			}

			// Actualizar finanzas
			await this.updateFinances(updates);

			return { success: true, id: transactionRef.id };
		} catch (error) {
			console.error('Error agregando transacción:', error);
			return { success: false, error: error.message };
		}
	}
	// Retornar el objeto de finanzas actual
	getCurrentFinances() {
		return this.finances;
	}
	// Obtener transacciones recientes del usuario actual
	async getRecentTransactions(limit = 10) {
		try {
			const userId = this.checkAuth();
			const snapshot = await this.db.collection('transactions')
				.where('userId', '==', userId)
				.get();
			let transactions = [];
			snapshot.forEach(doc => {
				let tx = { id: doc.id, ...doc.data() };
				transactions.push(tx);
			});
			// Ordenar por fecha de creación descendente
			transactions.sort((a, b) => {
				const dateA = a.createdAt ? a.createdAt.toDate().getTime() : 0;
				const dateB = b.createdAt ? b.createdAt.toDate().getTime() : 0;
				return dateB - dateA;
			});
			return transactions.slice(0, limit);
		} catch (error) {
			console.error('Error obteniendo transacciones recientes:', error);
			return [];
		}
	}
	// Escuchar cambios en la colección de transacciones del usuario actual
	listenToTransactions(callback) {
		try {
			const userId = this.checkAuth();
			return this.db.collection('transactions')
				.where('userId', '==', userId)
				.onSnapshot((snapshot) => {
					const transactions = [];
					snapshot.forEach(doc => {
						transactions.push({ id: doc.id, ...doc.data() });
					});
					// Ordenar por fecha de creación descendente
					transactions.sort((a, b) => {
						const dateA = a.createdAt ? a.createdAt.toDate().getTime() : 0;
						const dateB = b.createdAt ? b.createdAt.toDate().getTime() : 0;
						return dateB - dateA;
					});
					try {
						callback(transactions);
					} catch (error) {
						console.error('Error ejecutando callback de transacciones:', error);
					}
				}, (error) => {
					console.error('Error escuchando transacciones:', error);
					callback([]);
				});
		} catch (error) {
			console.error('Error configurando listener de transacciones:', error);
			return () => {};
		}
	}
	// Escuchar cambios en el documento de finanzas del usuario actual
	listenToFinances(callback) {
		try {
			const userId = this.checkAuth();
			return this.db.collection('finances').doc(userId)
				.onSnapshot((doc) => {
					if (doc.exists) {
						callback(doc.data());
					} else {
						callback(null);
					}
				}, (error) => {
					console.error('Error escuchando finanzas:', error);
					callback(null);
				});
		} catch (error) {
			console.error('Error configurando listener de finanzas:', error);
			return () => {};
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
		// Ejecutar migración automática de gastos VES a USD solo una vez por usuario
		this.runMigrationIfNeeded();
	}

	// Migración automática de gastos VES históricos
	async runMigrationIfNeeded() {
		try {
			const user = this.currentUser;
			if (!user) {
				console.log('[MIGRACIÓN] No hay usuario autenticado, no se ejecuta migración.');
				return;
			}
			const userId = user.uid;
			// Buscar si ya se ejecutó la migración (marcar con un campo en finances)
			const financesDoc = await this.db.collection('finances').doc(userId).get();
			if (financesDoc.exists && financesDoc.data().convertedMigrationDone) {
				console.log('[MIGRACIÓN] Ya se ejecutó la migración para este usuario.');
				return;
			}
			// Obtener tasa actual USD/VES
			let rate = 1;
			try {
				const res = await fetch('https://open.er-api.com/v6/latest/USD');
				const data = await res.json();
				rate = data.rates.VES || 1;
				console.log(`[MIGRACIÓN] Tasa actual USD/VES: ${rate}`);
			} catch (e) {
				console.error('[MIGRACIÓN] Error obteniendo tasa actual:', e);
				rate = 1;
			}
			// Obtener todas las transacciones del usuario
			const snapshot = await this.db.collection('transactions').where('userId', '==', userId).get();
			let updatedCount = 0;
			const batch = this.db.batch();
			snapshot.forEach(doc => {
				const tx = doc.data();
				// Solo gastos en VES sin convertedUSD
				if (tx.type === 'expense' && tx.currency === 'VES' && !tx.convertedUSD) {
					const convertedUSD = rate > 0 ? tx.amount / rate : null;
					batch.update(this.db.collection('transactions').doc(doc.id), {
						convertedUSD,
						usedRate: rate
					});
					updatedCount++;
					console.log(`[MIGRACIÓN] Actualizado: ${doc.id} | VES ${tx.amount} → USD ${convertedUSD}`);
				}
			});
			if (updatedCount > 0) {
				await batch.commit();
				console.log(`[MIGRACIÓN] Movimientos actualizados: ${updatedCount}`);
			} else {
				console.log('[MIGRACIÓN] No había movimientos para actualizar.');
			}
			// Marcar migración como realizada
			await this.db.collection('finances').doc(userId).update({ convertedMigrationDone: true });
			console.log('[MIGRACIÓN] Migración marcada como realizada.');
		} catch (error) {
			console.error('[MIGRACIÓN] Error en migración automática:', error);
		}
	}

	// Establecer usuario actual y ejecutar migración automática
	setCurrentUser(user) {
		this.currentUser = user;
		// Ejecutar migración automática después de autenticar
		this.runMigrationIfNeeded();
	}

	// Verificar si el usuario está autenticado
	checkAuth() {
		if (!this.currentUser) {
			throw new Error('Usuario no autenticado');
		}
		return this.currentUser.uid;
	}

	// Recalcular saldos de cajas USD y VES sumando todas las transacciones
	async recalculateBalances() {
		try {
			const userId = this.checkAuth();
			const snapshot = await this.db.collection('transactions').where('userId', '==', userId).get();
			let balanceUSD = 0;
			let balanceVES = 0;
			let totalIncomeUSD = 0;
			let totalExpenseUSD = 0;
			let totalIncomeVES = 0;
			let totalExpenseVES = 0;
			snapshot.forEach(doc => {
				const tx = doc.data();
				// USD
				if (tx.currency === 'USD') {
					if (tx.type === 'income') {
						balanceUSD += tx.amount;
						totalIncomeUSD += tx.amount;
					}
					if (tx.type === 'expense' || tx.type === 'savings') {
						balanceUSD -= tx.amount;
						totalExpenseUSD += tx.amount;
					}
					// Cambio de caja: egreso en USD
					if (tx.type === 'exchange') {
						balanceUSD -= tx.amount;
						totalExpenseUSD += tx.amount;
					}
				}
				// VES
				else if (tx.currency === 'VES') {
					if (tx.type === 'income') {
						balanceVES += tx.amount;
						totalIncomeVES += tx.amount;
					}
					if (tx.type === 'expense' || tx.type === 'savings') {
						balanceVES -= tx.amount;
						totalExpenseVES += tx.amount;
					}
					// Cambio de caja: ingreso en VES
					if (tx.type === 'exchange') {
						balanceVES += tx.amount;
						totalIncomeVES += tx.amount;
					}
				}
			});
			await this.updateFinances({
				balanceUSD,
				balanceVES,
				totalIncome: totalIncomeUSD,
				totalExpense: totalExpenseUSD,
				totalIncomeVES,
				totalExpenseVES
			});
			console.log(`[RECALCULAR] balanceUSD: ${balanceUSD}, balanceVES: ${balanceVES}`);
			return { balanceUSD, balanceVES };
		} catch (error) {
			console.error('Error recalculando balances:', error);
			return null;
		}
	}

		// Actualizar una transacción existente
		async updateTransaction(transaction) {
			try {
				const userId = this.checkAuth();
				if (!transaction.id) {
					return { success: false, error: 'ID de transacción requerido para editar.' };
				}
				// Actualizar los campos principales
				const updateData = { ...transaction };
				delete updateData.id;
				updateData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
				await this.db.collection('transactions').doc(transaction.id).update(updateData);
				// Opcional: recalcular balances si el monto/currency cambió
				await this.recalculateBalances();
				return { success: true };
			} catch (error) {
				console.error('Error actualizando transacción:', error);
				return { success: false, error: error.message };
			}
		}
	// El resto de métodos (deleteTransaction, setCurrentUser, checkAuth, etc.)
	// ...existing code...
}

// Instancia global de DatabaseManager
const dbManager = new DatabaseManager();
