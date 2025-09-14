// Gestión de transacciones
class TransactionsManager {
    // Permite registrar una transacción directamente desde otros módulos
    async handleTransactionSubmitDirect({type, amount, category, description, date, time}) {
        // Combinar fecha y hora en un solo string ISO
        const dateTime = date && time ? `${date}T${time}:00` : new Date().toISOString();
        const transaction = {
            type,
            amount,
            category,
            description,
            date: dateTime
        };
        const result = await dbManager.addTransaction(transaction);
        if (result.success) {
            if (window.transactionsPage && window.transactionsPage.currentPage === 'transactions') {
                window.transactionsPage.loadTransactions();
            }
            if (window.dashboardManager && window.dashboardManager.updateDashboard) {
                window.dashboardManager.updateDashboard();
            }
            if (window.UI && window.UI.showSuccess) {
                window.UI.showSuccess('Transacción registrada automáticamente');
            }
        } else {
            if (window.UI && window.UI.showError) {
                window.UI.showError(result.error || 'Error al registrar transacción automática');
            }
        }
    }
    constructor() {
        this.transactions = [];
        this.categories = {
            income: [
                { value: 'salary', label: 'Salario' },
                { value: 'freelance', label: 'Freelance' },
                { value: 'investment', label: 'Inversión' },
                { value: 'gift', label: 'Regalo' },
                { value: 'extra_income', label: 'Ingreso Extra' },
                { value: 'other_income', label: 'Otro Ingreso' }
            ],
            expense: [
                { value: 'grocery', label: 'Supermercado' },
                { value: 'utilities', label: 'Servicios' },
                { value: 'transport', label: 'Transporte' },
                { value: 'entertainment', label: 'Entretenimiento' },
                { value: 'health', label: 'Salud' },
                { value: 'education', label: 'Educación' },
                { value: 'shopping', label: 'Compras' },
                { value: 'dining', label: 'Alimentación' },
                { value: 'housing', label: 'Vivienda' },
                { value: 'emergency', label: 'Emergencia' },
                { value: 'other_expense', label: 'Otro Gasto' }
            ],
            savings: [
                { value: 'savings_transfer', label: 'Transferencia a Ahorros' },
                { value: 'investment', label: 'Inversión' },
                { value: 'emergency_fund', label: 'Fondo de Emergencia' },
                { value: 'retirement', label: 'Jubilación' },
                { value: 'goal', label: 'Meta Específica' },
                { value: 'other_savings', label: 'Otro Ahorro' }
            ]
        };
    }

    // Inicializar el manager de transacciones
    init() {
        this.setupEventListeners();
        this.loadCategoryOptions('income'); // Cargar categorías por defecto (ingreso)
    }

    // Configurar event listeners
    setupEventListeners() {
        // Listener para el formulario de transacciones
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTransactionSubmit();
        });

        // Listener para el tipo de transacción (cambiar categorías)
        document.getElementById('type').addEventListener('change', (e) => {
            this.loadCategoryOptions(e.target.value);
        });

        // Listener para el botón de agregar transacción
        document.getElementById('addTransactionBtn').addEventListener('click', () => {
            this.showTransactionModal();
        });
    }

    // Cargar opciones de categoría según el tipo
    loadCategoryOptions(type) {
        const categorySelect = document.getElementById('category');
        categorySelect.innerHTML = '';

        const categories = this.categories[type] || [];
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.value;
            option.textContent = category.label;
            categorySelect.appendChild(option);
        });
    }

    // Mostrar modal de transacción
    showTransactionModal() {
        // Establecer fecha y hora actual por defecto
        const now = new Date();
        document.getElementById('date').value = now.toISOString().split('T')[0];
        document.getElementById('time').value = now.toTimeString().slice(0,5);
        // Siempre mostrar 'Agregar Transacción' al abrir
        document.getElementById('transactionModalTitle').textContent = 'Agregar Transacción';
        document.getElementById('transactionDeleteBtn').style.display = 'none';
        document.getElementById('transactionForm').reset();
        // Mostrar símbolo de moneda correcto en el input
        const moneda = document.getElementById('currencySelect') ? document.getElementById('currencySelect').value : 'USD';
        const symbol = moneda === 'VES' ? 'Bs' : (moneda === 'EUR' ? '€' : '$');
        const amountInput = document.getElementById('amount');
        if (amountInput) {
            amountInput.placeholder = `Monto (${symbol})`;
            amountInput.previousSymbol = symbol;
        }
        UI.showTransactionModal();
    }

    // Manejar envío del formulario de transacción
    async handleTransactionSubmit() {
        const type = document.getElementById('type').value;
        const amountInput = document.getElementById('amount');
        let amount = parseFloat(amountInput.value);
        const category = document.getElementById('category').value;
        const description = document.getElementById('description').value;
        const date = document.getElementById('date').value;
        const time = document.getElementById('time').value;
        // Validaciones
        if (amount <= 0) {
            UI.showError('El monto debe ser mayor a cero');
            return;
        }
        // Convertir a USD si la moneda seleccionada no es USD
        const moneda = document.getElementById('currencySelect') ? document.getElementById('currencySelect').value : 'USD';
        const cm = window.currencyManager;
        if (cm && moneda !== 'USD') {
            // Convertir de moneda seleccionada a USD
            amount = cm.convert(amount, moneda, 'USD');
        }
        if (type !== 'income' && amount > dbManager.getCurrentFinances().totalBalance) {
            UI.showError('Fondos insuficientes para esta transacción');
            return;
        }
        // Combinar fecha y hora en un solo string ISO
        const dateTime = date && time ? `${date}T${time}:00` : new Date().toISOString();
        const transaction = {
            type,
            amount,
            category,
            description,
            date: dateTime
        };
        const user = authManager.getCurrentUser();
        const result = await dbManager.addTransaction(transaction);
        if (result.success) {
            // Limpiar formulario
            document.getElementById('transactionForm').reset();
            // Recargar categorías por defecto
            this.loadCategoryOptions('income');
            // Cerrar modal
            UI.hideModal(UI.modals.transaction);
            // Restaurar título
            document.getElementById('transactionModalTitle').textContent = 'Agregar Transacción';
            // Mostrar mensaje de éxito
            UI.showSuccess('Transacción agregada correctamente');
            // Si estamos en la página de transacciones, actualizar la lista automáticamente
            if (window.transactionsPage && window.transactionsPage.currentPage === 'transactions') {
                window.transactionsPage.loadTransactions();
            }
        } else {
            UI.showError(result.error);
        }
    }

    // Cargar y mostrar transacciones
    async loadTransactions() {
        const user = authManager.getCurrentUser();
        if (!user) return;

        this.transactions = await dbManager.getRecentTransactions();
        this.displayTransactions();
    }

    // Mostrar transacciones en la UI
    displayTransactions() {
        const transactionsList = document.getElementById('transactionsList');
        transactionsList.innerHTML = '';

        if (this.transactions.length === 0) {
            transactionsList.innerHTML = '<p class="no-transactions">No hay transacciones recientes</p>';
            return;
        }

        this.transactions.forEach(transaction => {
            const transactionElement = this.createTransactionElement(transaction);
            transactionsList.appendChild(transactionElement);
        });
    }

    // Crear elemento HTML para una transacción
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
                ${this.getCategoryIcon(transaction.category, transaction.type)}
            </div>
            <div class="transaction-details">
                <div class="transaction-description">${transaction.description}</div>
                <div class="transaction-category">${this.getCategoryLabel(transaction.category, transaction.type)} • ${formattedDate}</div>
            </div>
            <div class="transaction-amount ${amountClass}">
                ${sign}$${transaction.amount.toFixed(2)}
            </div>
        `;

        return div;
    }

    // Obtener icono según categoría y tipo
    getCategoryIcon(category, type) {
        const icons = {
            // Ingresos
            salary: '💰',
            freelance: '💼',
            investment: '📈',
            gift: '🎁',
            extra_income: '💸',
            other_income: '📊',
            
            // Gastos
            grocery: '🛒',
            utilities: '🏠',
            transport: '🚗',
            entertainment: '🎬',
            health: '🏥',
            education: '🎓',
            shopping: '🛍️',
            dining: '🍽️',
            housing: '🏡',
            emergency: '🚨',
            other_expense: '📋',
            
            // Ahorros
            savings_transfer: '💰',
            emergency_fund: '🛡️',
            retirement: '👵',
            goal: '🎯',
            other_savings: '📊'
        };
        
        return icons[category] || (type === 'income' ? '💰' : (type === 'savings' ? '💰' : '💸'));
    }

    // Obtener etiqueta de categoría traducida
    getCategoryLabel(categoryValue, type) {
        const categories = this.categories[type] || [];
        const category = categories.find(cat => cat.value === categoryValue);
        return category ? category.label : 'Otro';
    }

    // Obtener transacciones por categoría para gráficos
    getTransactionsByCategory(transactions, type) {
        const categories = {};
        
        transactions.forEach(transaction => {
            if (transaction.type === type) {
                if (!categories[transaction.category]) {
                    categories[transaction.category] = 0;
                }
                categories[transaction.category] += transaction.amount;
            }
        });
        
        return categories;
    }
}

// Instancia global del administrador de transacciones
const transactionsManager = new TransactionsManager();
window.transactionsManager = transactionsManager;