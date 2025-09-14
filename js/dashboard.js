// dashboard.js - Versión corregida
class DashboardManager {
    constructor() {
        this.financesUnsubscribe = null;
        this.transactionsUnsubscribe = null;
        this.stats = {
            totalBalance: 0,
            monthlyExpenses: 0,
            monthlyIncome: 0,
            totalSavings: 0
        };
    }

    // Inicializar el dashboard
    init() {
        this.setupRealTimeListeners();
        this.updateDashboard();
    }

    // Configurar listeners en tiempo real
    setupRealTimeListeners() {
        const user = authManager.getCurrentUser();
        if (!user) return;

        // Escuchar cambios en las finanzas
        this.financesUnsubscribe = dbManager.listenToFinances((finances) => {
            this.updateStatsCards(finances);
            this.stats = { ...finances };
        });

        // Escuchar cambios en las transacciones
        this.transactionsUnsubscribe = dbManager.listenToTransactions((transactions) => {
            // Actualizar transacciones recientes
            this.updateRecentTransactions(transactions.slice(0, 5));
            
            // Actualizar gráficos con los nuevos datos
            this.updateCharts(transactions);
        });
    }

    // Actualizar todo el dashboard
    async updateDashboard() {
        const user = authManager.getCurrentUser();
        if (!user) return;

        try {
            // Cargar finanzas
            const finances = await dbManager.loadUserFinances(user.uid);
            if (finances) {
                this.updateStatsCards(finances);
                this.stats = { ...finances };
            }

            // Cargar transacciones
            const transactions = await dbManager.getRecentTransactions(30);
            
            // Actualizar transacciones recientes
            this.updateRecentTransactions(transactions.slice(0, 5));
            
            // Actualizar gráficos
            this.updateCharts(transactions);
            
        } catch (error) {
            console.error('Error actualizando dashboard:', error);
        }
    }

    // Actualizar las tarjetas de estadísticas
    updateStatsCards(finances) {
        document.getElementById('totalBalance').textContent = `$${finances.totalBalance.toFixed(2)}`;
        document.getElementById('monthlyExpenses').textContent = `$${finances.monthlyExpenses.toFixed(2)}`;
        document.getElementById('monthlyIncome').textContent = `$${finances.monthlyIncome.toFixed(2)}`;
        document.getElementById('totalSavings').textContent = `$${finances.totalSavings.toFixed(2)}`;
        // Actualizar tarjeta "Me Deben" si existe
        if (typeof debtCreditManager !== 'undefined' && debtCreditManager.credits) {
            const credits = debtCreditManager.credits;
            const total = credits.reduce((sum, c) => sum + (c.amount || 0), 0);
            const devuelto = credits.reduce((sum, c) => sum + (c.returned || 0), 0);
            const porCobrar = Math.max(0, total - devuelto);
            const meDebenTotal = document.getElementById('meDebenTotal');
            if (meDebenTotal) {
                meDebenTotal.textContent = `$${porCobrar.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`;
            }
        }
    }

    // Actualizar gráficos
    async updateCharts(transactions) {
        try {
            // Actualizar gráfico de gastos diarios
            const dailyData = await this.getDailySpendingData(transactions);
            if (chartsManager.dailySpendingChart) {
                chartsManager.updateDailySpendingChart(dailyData);
            }
            
            // Actualizar gráfico de gastos por categoría
            const categoryData = await this.getCategoryExpensesData(transactions);
            if (chartsManager.categoryExpensesChart) {
                chartsManager.updateCategoryExpensesChart(categoryData);
            }
        } catch (error) {
            console.error('Error actualizando gráficos:', error);
        }
    }

    // Obtener datos de gastos diarios de los últimos 7 días
    async getDailySpendingData(transactions) {
        try {
            // Filtrar solo gastos de los últimos 7 días
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const expenses = transactions.filter(t => 
                t.type === 'expense' && 
                new Date(t.date) >= sevenDaysAgo
            );
            
            // Agrupar por día
            const dailyData = {};
            const labels = [];
            const expensesData = [];
            
            // Inicializar datos para los últimos 7 días
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                
                const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                const dayName = dayNames[date.getDay()];
                
                labels.push(dayName);
                dailyData[dateStr] = 0;
            }
            
            // Sumar gastos por día
            expenses.forEach(expense => {
                const dateStr = expense.date;
                if (dailyData.hasOwnProperty(dateStr)) {
                    dailyData[dateStr] += expense.amount;
                }
            });
            
            // Preparar datos para el gráfico
            Object.keys(dailyData).forEach(dateStr => {
                expensesData.push(dailyData[dateStr]);
            });
            
            // Obtener presupuesto diario (promedio mensual)
            const budgetData = new Array(7).fill(await this.getDailyBudget());
            
            return {
                labels: labels,
                expenses: expensesData,
                budget: budgetData
            };
        } catch (error) {
            console.error('Error obteniendo datos de gastos diarios:', error);
            return {
                labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
                expenses: [0, 0, 0, 0, 0, 0, 0],
                budget: [0, 0, 0, 0, 0, 0, 0]
            };
        }
    }
    
    // Obtener presupuesto diario (promedio mensual)
    async getDailyBudget() {
        // En una implementación real, esto vendría de la configuración del usuario
        // Por ahora, usaremos un valor predeterminado basado en gastos mensuales
        return this.stats.monthlyExpenses > 0 ? this.stats.monthlyExpenses / 30 : 60;
    }
    
    // Obtener datos de gastos por categoría
    async getCategoryExpensesData(transactions) {
        try {
            const expenses = transactions.filter(t => t.type === 'expense');
            
            // Agrupar por categoría
            const categoryData = {};
            
            expenses.forEach(expense => {
                if (!categoryData[expense.category]) {
                    categoryData[expense.category] = 0;
                }
                categoryData[expense.category] += expense.amount;
            });
            
            // Preparar datos para el gráfico
            const labels = [];
            const values = [];
            
            Object.keys(categoryData).forEach(category => {
                labels.push(transactionsManager.getCategoryLabel(category, 'expense'));
                values.push(categoryData[category]);
            });
            
            return {
                labels: labels,
                values: values
            };
        } catch (error) {
            console.error('Error obteniendo datos de gastos por categoría:', error);
            return {
                labels: ['Comida', 'Transporte', 'Entretenimiento'],
                values: [100, 50, 75]
            };
        }
    }

    // Actualizar transacciones recientes
    updateRecentTransactions(transactions) {
        const transactionsList = document.getElementById('transactionsList');
        if (!transactionsList) return;
        
        transactionsList.innerHTML = '';

        if (transactions.length === 0) {
            transactionsList.innerHTML = `
                <div class="no-transactions">
                    <p>No hay transacciones recientes</p>
                </div>
            `;
            return;
        }

        transactions.forEach(transaction => {
            const transactionElement = this.createTransactionElement(transaction);
            transactionsList.appendChild(transactionElement);
        });
    }

    // Crear elemento HTML para una transacción (versión resumida)
    createTransactionElement(transaction) {
        const div = document.createElement('div');
        div.className = 'transaction-item';

        const isIncome = transaction.type === 'income';
        const isSavings = transaction.type === 'savings';
        const sign = isIncome ? '+' : '-';
        const amountClass = isIncome ? 'positive' : (isSavings ? 'savings' : 'negative');

        // Formatear fecha
        const date = new Date(transaction.date);
        const formattedDate = date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short'
        });

        div.innerHTML = `
            <div class="transaction-icon">
                ${transactionsManager.getCategoryIcon(transaction.category, transaction.type)}
            </div>
            <div class="transaction-details">
                <div class="transaction-description">${transaction.description}</div>
                <div class="transaction-category">${transactionsManager.getCategoryLabel(transaction.category, transaction.type)}</div>
            </div>
            <div class="transaction-amount ${amountClass}">
                ${sign}$${transaction.amount.toFixed(2)}
            </div>
            <div class="transaction-date">
                ${formattedDate}
            </div>
        `;

        return div;
    }

    // Limpiar listeners al cerrar sesión
    cleanup() {
        if (this.financesUnsubscribe) {
            this.financesUnsubscribe();
        }
        if (this.transactionsUnsubscribe) {
            this.transactionsUnsubscribe();
        }
    }
}

// Instancia global del administrador del dashboard
const dashboardManager = new DashboardManager();
window.dashboardManager = dashboardManager;