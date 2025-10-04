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

    // Actualizar la card resumen de préstamos y deudas
    updateLoansDebtsSummary() {
        if (typeof debtCreditManager === 'undefined' || !window.currencyManager) return;
        const cm = window.currencyManager;
        const moneda = document.getElementById('currencySelect') ? document.getElementById('currencySelect').value : 'USD';
        const base = this.stats.baseCurrency || 'USD';
        // Préstamos (credits)
        const credits = debtCreditManager.credits || [];
        const totalLoansGiven = credits.reduce((sum, c) => sum + (c.amount || 0), 0);
        const totalLoansCollected = credits.reduce((sum, c) => sum + (c.returned || 0), 0);
        const loansToCollect = Math.max(0, totalLoansGiven - totalLoansCollected);
        // Deudas (debts)
        const debts = debtCreditManager.debts || [];
        const totalDebts = debts.reduce((sum, d) => sum + (d.amount || 0), 0);
        const totalDebtsPaid = debts.reduce((sum, d) => sum + (d.paid || 0), 0);
        const debtsPending = Math.max(0, totalDebts - totalDebtsPaid);

        // Actualizar valores en la card con conversión
        const el = (id) => document.getElementById(id);
        const symbol = moneda === 'VES' ? 'Bs ' : (moneda === 'EUR' ? '€' : '$');
        if (el('loansToCollect')) el('loansToCollect').textContent = symbol + cm.convert(loansToCollect, base, moneda).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
        if (el('debtsPending')) el('debtsPending').textContent = symbol + cm.convert(debtsPending, base, moneda).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
        if (el('loansGiven')) el('loansGiven').textContent = symbol + cm.convert(totalLoansGiven, base, moneda).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
        if (el('debtsPaid')) el('debtsPaid').textContent = symbol + cm.convert(totalDebtsPaid, base, moneda).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
        if (el('loansCollected')) el('loansCollected').textContent = symbol + cm.convert(totalLoansCollected, base, moneda).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});

        // Progreso de cobro (préstamos)
        let percentLoans = totalLoansGiven > 0 ? (totalLoansCollected / totalLoansGiven) * 100 : 0;
        percentLoans = Math.round(percentLoans);
        if (el('loansProgress')) el('loansProgress').style.width = percentLoans + '%';
        if (el('loansProgressPercent')) el('loansProgressPercent').textContent = percentLoans + '%';

        // Progreso de pago (deudas)
        let percentDebts = totalDebts > 0 ? (totalDebtsPaid / totalDebts) * 100 : 0;
        percentDebts = Math.round(percentDebts);
        if (el('debtsProgress')) el('debtsProgress').style.width = percentDebts + '%';
        if (el('debtsProgressPercent')) el('debtsProgressPercent').textContent = percentDebts + '%';
    }

    // Inicializar el dashboard
    init() {
        this.setupRealTimeListeners();
        // Inicializar la moneda global según el selector visual
        const flag = document.getElementById('currencyFlag');
        // Sincronizar moneda global y visual
        let visualCurrency = flag && flag.textContent === 'Bs' ? 'VES' : 'USD';
        window.dashboardCurrency = visualCurrency;
        console.log('[Dashboard INIT] Moneda visual:', flag ? flag.textContent : 'N/A');
        console.log('[Dashboard INIT] Moneda global:', window.dashboardCurrency);
        // Actualizar dashboard solo una vez con la moneda correcta
        dashboardManager.updateDashboardCurrency();
        // Listener para actualizar la card resumen cuando cambian deudas/préstamos
        setTimeout(() => this.updateLoansDebtsSummary(), 1000);
        document.addEventListener('debtCreditUpdated', () => this.updateLoansDebtsSummary());
        window.addEventListener('resize', () => this.updateLoansDebtsSummary());

        // Alternar moneda principal al hacer clic en el botón
        const currencySelector = document.querySelector('.custom-currency-selector');
        if (currencySelector) {
            currencySelector.addEventListener('click', async () => {
                const flag = document.getElementById('currencyFlag');
                const label = currencySelector.querySelector('span');
                // Alternar entre USD y VES
                let current = flag.textContent === '$' ? 'USD' : 'VES';
                let next = current === 'USD' ? 'VES' : 'USD';
                // Cambiar visualmente
                flag.textContent = next === 'USD' ? '$' : 'Bs';
                label.textContent = next === 'USD' ? 'USD - Dólar' : 'Bs - Bolívar';
                // Actualizar lógica global
                window.dashboardCurrency = next;
                // Actualizar tarjetas con la nueva moneda
                await dashboardManager.updateDashboardCurrency();
            });
        }
        // Acción para 'Ver Todos' de Balance
        const viewAllBalance = document.getElementById('viewAllBalance');
        if (viewAllBalance) {
            viewAllBalance.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                const nav = document.querySelector('.nav-item[data-page="balance"]');
                if (nav) nav.classList.add('active');
                UI.showPage('balance-page');
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
        // Acción para 'Ver Todos' de Transacciones Recientes
        const viewAllTransactions = document.getElementById('viewAllTransactions');
        if (viewAllTransactions) {
            viewAllTransactions.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                const nav = document.querySelector('.nav-item[data-page="transactions"]');
                if (nav) nav.classList.add('active');
                UI.showPage('transactions-page');
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
    }

    // Nueva función para actualizar las tarjetas del dashboard según la moneda seleccionada
    async updateDashboardCurrency() {
        // Sincronizar moneda visual y global antes de actualizar
        const flag = document.getElementById('currencyFlag');
        if (flag) {
            let visualCurrency = flag.textContent === 'Bs' ? 'VES' : 'USD';
            window.dashboardCurrency = visualCurrency;
        }
        // Obtener la moneda seleccionada
        const moneda = window.dashboardCurrency || 'USD';
        // Obtener la tasa de cambio desde exchangerate-api
        let tasa = 1;
        try {
            const res = await fetch('https://open.er-api.com/v6/latest/USD');
            const data = await res.json();
            tasa = data.rates.VES || 1;
        } catch (e) { tasa = 1; }
        // Obtener todas las transacciones
        const transactions = await dbManager.getRecentTransactions(100);
        // FILTRO MENSUAL: solo transacciones del mes actual
        const now = new Date();
        const currentMonth = now.toISOString().slice(0,7); // 'YYYY-MM'
        const monthlyTransactions = transactions.filter(t => {
            if (!t.date) return false;
            const txMonth = t.date.slice(0,7);
            return txMonth === currentMonth;
        });
        // Calcular saldo inicial de cada caja
        const initialUSD = monthlyTransactions.find(t => t.type === 'initial_balance' && t.currency === 'USD');
        const initialVES = monthlyTransactions.find(t => t.type === 'initial_balance' && t.currency === 'VES');
        // Calcular movimientos del mes actual
        const filteredNoInitial = monthlyTransactions.filter(t => t.type !== 'initial_balance');
        const totalIncomeUSD = filteredNoInitial.filter(t => t.type === 'income' && t.currency === 'USD').reduce((sum, t) => sum + t.amount, 0);
        const totalExpenseUSD = filteredNoInitial.filter(t => t.type === 'expense' && t.currency === 'USD').reduce((sum, t) => sum + t.amount, 0);
        const totalSavingsUSD = filteredNoInitial.filter(t => t.type === 'savings' && t.currency === 'USD').reduce((sum, t) => sum + t.amount, 0);
        const totalIncomeVES = filteredNoInitial.filter(t => t.type === 'income' && t.currency === 'VES').reduce((sum, t) => sum + t.amount, 0);
        const totalExpenseVES = filteredNoInitial.filter(t => t.type === 'expense' && t.currency === 'VES').reduce((sum, t) => sum + t.amount, 0);
        const totalSavingsVES = filteredNoInitial.filter(t => t.type === 'savings' && t.currency === 'VES').reduce((sum, t) => sum + t.amount, 0);
        // Sumar saldo inicial + movimientos
        let subtotalUSD = (initialUSD ? initialUSD.amount : 0) + totalIncomeUSD - totalExpenseUSD + totalSavingsUSD;
        let subtotalVES = (initialVES ? initialVES.amount : 0) + totalIncomeVES - totalExpenseVES + totalSavingsVES;
        // Procesar exchanges igual que en transactions-page.js
        monthlyTransactions.filter(t => t.type === 'exchange').forEach(t => {
            if (t.currency === 'USD' && t.category && t.category.includes('_to_ves')) {
                subtotalUSD -= t.amount;
            }
            if (t.currency === 'VES' && t.category && t.category.includes('_from_usd')) {
                subtotalVES += t.amount;
            }
            if (t.currency === 'VES' && t.category && t.category.includes('_to_usd')) {
                subtotalVES -= t.amount;
            }
            if (t.currency === 'USD' && t.category && t.category.includes('_from_ves')) {
                subtotalUSD += t.amount;
            }
        });
        // Calcular el balance total según la moneda seleccionada
        let balanceTotal = 0;
        if (moneda === 'USD') {
            balanceTotal = subtotalUSD + (subtotalVES / tasa);
        } else {
            balanceTotal = subtotalVES + (subtotalUSD * tasa);
        }
        document.getElementById('totalBalance').textContent = (moneda === 'USD' ? '$' : 'Bs ') + balanceTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
        // Gastos mensuales SOLO del mes actual
        const monthlyExpensesUSD = monthlyTransactions.filter(t => t.currency === 'USD' && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const monthlyExpensesVES = monthlyTransactions.filter(t => t.currency === 'VES' && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        let totalMonthlyExpenses = 0;
        if (moneda === 'USD') {
            totalMonthlyExpenses = monthlyExpensesUSD + (monthlyExpensesVES / tasa);
        } else {
            totalMonthlyExpenses = monthlyExpensesVES + (monthlyExpensesUSD * tasa);
        }
        document.getElementById('monthlyExpenses').textContent = (moneda === 'USD' ? '$' : 'Bs ') + totalMonthlyExpenses.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
        // Ingresos mensuales SOLO del mes actual
        const monthlyIncomeUSD = monthlyTransactions.filter(t => t.currency === 'USD' && t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const monthlyIncomeVES = monthlyTransactions.filter(t => t.currency === 'VES' && t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        let totalMonthlyIncome = 0;
        if (moneda === 'USD') {
            totalMonthlyIncome = monthlyIncomeUSD + (monthlyIncomeVES / tasa);
        } else {
            totalMonthlyIncome = monthlyIncomeVES + (monthlyIncomeUSD * tasa);
        }
        document.getElementById('monthlyIncome').textContent = (moneda === 'USD' ? '$' : 'Bs ') + totalMonthlyIncome.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
        // Ahorros SOLO del mes actual
    // (Eliminado: ya se calcula arriba con el saldo inicial)
        let totalSavings = 0;
        if (moneda === 'USD') {
            totalSavings = totalSavingsUSD + (totalSavingsVES / tasa);
        } else {
            totalSavings = totalSavingsVES + (totalSavingsUSD * tasa);
        }
        document.getElementById('totalSavings').textContent = (moneda === 'USD' ? '$' : 'Bs ') + totalSavings.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
    }

    // Configurar listeners en tiempo real
    setupRealTimeListeners() {
        const user = authManager.getCurrentUser();
        if (!user) return;

        // Escuchar cambios en las finanzas
        this.financesUnsubscribe = dbManager.listenToFinances((finances) => {
            this.stats = { ...finances };
        });

        // Escuchar cambios en las transacciones
        this.transactionsUnsubscribe = dbManager.listenToTransactions((transactions) => {
            // Actualizar transacciones recientes
            this.updateRecentTransactions(transactions.slice(0, 5));
            // Actualizar tarjetas del dashboard inmediatamente
            this.updateDashboardCurrency();
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
            // Sumar gastos por día y log para depuración
            expenses.forEach(expense => {
                // Normalizar la fecha del gasto a formato YYYY-MM-DD
                let expenseDate = expense.date;
                if (expenseDate instanceof Date) {
                    expenseDate = expenseDate.toISOString().split('T')[0];
                }
                // Buscar coincidencia exacta con las claves de dailyData
                Object.keys(dailyData).forEach(dateKey => {
                    if (expenseDate === dateKey) {
                        let montoSumado = 0;
                        if (expense.currency === 'VES') {
                            // Siempre sumar solo el campo convertedUSD
                            if (typeof expense.convertedUSD === 'number' && expense.convertedUSD > 0) {
                                dailyData[dateKey] += expense.convertedUSD;
                                montoSumado = expense.convertedUSD;
                            } else {
                                montoSumado = 0;
                            }
                        } else {
                            dailyData[dateKey] += expense.amount;
                            montoSumado = expense.amount;
                        }
                        console.log(`[GRAFICA DIARIA] Día: ${dateKey} | Monto sumado: ${montoSumado} | Moneda: ${expense.currency} | Desc: ${expense.description}`);
                    }
                });
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
            // Agrupar por categoría y sumar SOLO en USD
            const categoryData = {};
            expenses.forEach(expense => {
                if (!categoryData[expense.category]) {
                    categoryData[expense.category] = 0;
                }
                // Si el gasto es en VES, sumar el campo convertidoUSD; si es USD, sumar el amount
                if (expense.currency === 'VES' && expense.convertedUSD) {
                    categoryData[expense.category] += expense.convertedUSD;
                } else if (expense.currency === 'USD') {
                    categoryData[expense.category] += expense.amount;
                }
                // Si el gasto es en otra moneda, ignorar o adaptar según lógica futura
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
        // LOG: Mostrar fechas, montos y descripciones de las transacciones recientes
        console.log('[RECENTES DASHBOARD] Transacciones mostradas:');
        transactions.forEach(transaction => {
            console.log(`Fecha: ${transaction.date} | Monto: ${transaction.amount} | Moneda: ${transaction.currency} | Desc: ${transaction.description}`);
            let symbol = '$';
            if (transaction.currency === 'VES') symbol = 'Bs ';
            else if (transaction.currency === 'EUR') symbol = '€';
            const amount = symbol + transaction.amount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
            let formattedDate = '';
            if (transaction.date) {
                const [year, month, day] = transaction.date.split('-');
                const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
                formattedDate = `${parseInt(day,10)} ${meses[parseInt(month,10)-1]}`;
            }
            const div = document.createElement('div');
            div.className = 'transaction-item';
            div.innerHTML = `
                <div class="transaction-avatar">${transactionsManager.getCategoryIcon(transaction.category, transaction.type)}</div>
                <div class="transaction-info">
                    <div class="transaction-title">${transaction.description}</div>
                    <div class="transaction-category">${transactionsManager.getCategoryLabel(transaction.category, transaction.type)}</div>
                    <div class="transaction-time">${formattedDate}</div>
                </div>
                <div class="transaction-amount ${transaction.type === 'expense' ? 'expense' : 'income'}">${transaction.type === 'income' ? '+' : '-'}${amount}</div>
            `;
            transactionsList.appendChild(div);
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
        // Conversión de moneda
        const cm = window.currencyManager;
        const moneda = document.getElementById('currencySelect') ? document.getElementById('currencySelect').value : 'USD';
        const base = this.stats.baseCurrency || 'USD';
        const symbol = moneda === 'VES' ? 'Bs ' : (moneda === 'EUR' ? '€' : '$');
        const amountConv = cm ? cm.convert(transaction.amount, base, moneda) : transaction.amount;
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
                ${sign}${symbol}${amountConv.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
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