console.log('[DEBUG] Archivo transactions.js cargado');
// Gestión de transacciones
class TransactionsManager {
    // Permite registrar una transacción directamente desde otros módulos
    async handleTransactionSubmitDirect({ type, amount, category, description, date, time, currency, rate }) {
        // Usar la fecha seleccionada por el usuario en formato YYYY-MM-DD
        let dateStr = date;
        if (dateStr && dateStr.includes('T')) {
            dateStr = dateStr.split('T')[0];
        }
        // Si la fecha viene en formato DD/MM/YYYY, convertir a YYYY-MM-DD
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            const [day, month, year] = dateStr.split('/');
            dateStr = `${year}-${month}-${day}`;
        }
        // Combinar fecha y hora en un solo string ISO para auditoría interna, pero guardar date y time por separado
        const dateTime = dateStr && time ? `${dateStr}T${time}:00` : new Date().toISOString();
        // Permitir que exchangeId se pase desde el objeto
        const transaction = {
            type,
            amount,
            category,
            description,
            date: dateStr,
            time: time,
            currency,
            ...(arguments[0].exchangeId ? { exchangeId: arguments[0].exchangeId } : {}),
            ...(arguments[0].passiveIncomeId ? { passiveIncomeId: arguments[0].passiveIncomeId } : {})
        };
        // Si es gasto en VES, calcular convertedUSD usando la tasa manual si viene del flujo de deuda/cobro/ingreso pasivo
        if ((type === 'expense' || type === 'income') && currency === 'VES') {
            // Si se pasa una tasa manual, usarla; si no, usar la del sistema (solo para otros flujos)
            let usedRate = rate;
            if (!usedRate || usedRate <= 0) {
                if (window.currencyManager && window.currencyManager.fetchRates) {
                    await window.currencyManager.fetchRates('USD');
                }
                usedRate = window.currencyManager ? window.currencyManager.getRate('VES', 'USD') : 0;
            }
            transaction.convertedUSD = (usedRate && amount > 0) ? Number((amount / usedRate).toFixed(2)) : 0;
            transaction.rate = usedRate;
            console.log(`[CONVERSION VES→USD] Monto VES: ${amount} | Tasa usada: ${usedRate} | Monto USD: ${transaction.convertedUSD}`);
        }
        const result = await dbManager.addTransaction(transaction);
        if (result.success) {
            if (window.transactionsPage && window.transactionsPage.currentPage === 'transactions') {
                window.transactionsPage.loadTransactions();
            }
            // Forzar recarga de la gráfica diaria con los datos más recientes
            if (window.dashboardManager && window.dashboardManager.updateCharts) {
                const txs = await dbManager.getRecentTransactions(100);
                window.dashboardManager.updateCharts(txs);
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
        // Actualizar el placeholder del monto según la moneda seleccionada
        const currencyRadios = document.querySelectorAll('input[name="currency"]');
        currencyRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                const symbol = radio.value === 'VES' ? 'Bs' : '$';
                const amountInput = document.getElementById('amount');
                if (amountInput) {
                    amountInput.placeholder = `Monto (${symbol})`;
                }
            });
        });
    }

    // Configurar event listeners
    setupEventListeners() {
        // Listener para el formulario de transacciones
        const transactionForm = document.getElementById('transactionForm');
        if (!transactionForm._listenerAdded) {
            transactionForm.addEventListener('submit', (e) => {
                console.log('[TRANSACTION FORM SUBMIT] Listener disparado');
                e.preventDefault();
                this.handleTransactionSubmit();
            });
            transactionForm._listenerAdded = true;
            console.log('[TRANSACTION FORM] Listener de submit agregado');
        } else {
            console.log('[TRANSACTION FORM] Listener de submit ya estaba agregado');
        }

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
        document.getElementById('time').value = now.toTimeString().slice(0, 5);
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
        console.log('[DEBUG] handleTransactionSubmit INICIO');
        // Log para confirmar fecha/hora seleccionadas
        const dateInput = document.getElementById('date');
        const timeInput = document.getElementById('time');
        const selectedDate = dateInput ? dateInput.value : null;
        const selectedTime = timeInput ? timeInput.value : null;
        console.log('[LOG] Fecha seleccionada en formulario:', selectedDate);
        console.log('[LOG] Hora seleccionada en formulario:', selectedTime);
        const type = document.getElementById('type').value;
        const amountInput = document.getElementById('amount');
        let amount = parseFloat(amountInput.value);
        const category = document.getElementById('category').value;
        const description = document.getElementById('description').value;
        let date = document.getElementById('date').value;
        const time = document.getElementById('time').value;
        // Convertir fecha de DD/MM/YYYY a YYYY-MM-DD si es necesario
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
            const [day, month, year] = date.split('/');
            date = `${year}-${month}-${day}`;
        }
        // Obtener moneda seleccionada
        const currency = document.querySelector('input[name="currency"]:checked')?.value || 'USD';
        // Validaciones
        if (amount <= 0) {
            UI.showError('El monto debe ser mayor a cero');
            return;
        }
        // Combinar fecha y hora en un solo string ISO, usar la seleccionada por el usuario
        const dateTime = (date && time) ? `${date}T${time}:00` : new Date().toISOString();
        // Detectar si es edición (campo oculto transactionId)
        const transactionId = document.getElementById('transactionId')?.value;
        const transaction = {
            type,
            amount,
            currency,
            category,
            description,
            date: date,
            time: time
        };
        // Si es gasto en VES, actualizar tasas y calcular convertedUSD antes de guardar
        if (type === 'expense' && currency === 'VES') {
            if (window.currencyManager && window.currencyManager.fetchRates) {
                await window.currencyManager.fetchRates('USD');
            }
            const rate = window.currencyManager ? window.currencyManager.getRate('VES', 'USD') : 0;
            // Conversión estándar: USD = VES / tasa VES→USD
            transaction.convertedUSD = (rate && amount > 0) ? Number((amount / rate).toFixed(2)) : 0;
            transaction.rate = rate;
            console.log(`[CONVERSION VES→USD] Monto VES: ${amount} | Tasa usada: ${rate} | Monto USD: ${transaction.convertedUSD}`);
        }
        const user = authManager.getCurrentUser();
        let result;
        if (transactionId) {
            // Edición: actualizar transacción existente
            transaction.id = transactionId;
            result = await this.updateTransaction(transaction);
        } else {
            // Nuevo registro
            result = await dbManager.addTransaction(transaction);
        }
        console.log('[DEBUG] Resultado de transacción:', result);
        if (result.success) {
            console.log('[DEBUG] Transacción guardada correctamente, actualizando historial...');
            // Limpiar formulario
            document.getElementById('transactionForm').reset();
            // Recargar categorías por defecto
            this.loadCategoryOptions('income');
            // Actualizar historial de inmediato y esperar a que termine
            if (window.transactionsPage) {
                console.log('[DEBUG] Actualizando historial...');
                await window.transactionsPage.loadTransactions();
                console.log('[DEBUG] Historial actualizado');
            }
            // Cerrar modal
            UI.hideModal(UI.modals.transaction);
            // Restaurar título
            document.getElementById('transactionModalTitle').textContent = 'Agregar Transacción';
            // Mostrar mensaje de éxito
            UI.showSuccess(transactionId ? 'Transacción editada correctamente' : 'Transacción agregada correctamente');
        } else {
            UI.showError(result.error);
        }
    }

    // Método para actualizar una transacción existente
    async updateTransaction(transaction) {
        // Actualizar en la base de datos
        const result = await dbManager.updateTransaction(transaction);
        // Sincronizar historial si es necesario
        if (result.success && window.transactionsPage) {
            await window.transactionsPage.loadTransactions();
        }
        return result;
    }

    // Cargar y mostrar transacciones
    async loadTransactions() {
        console.log('[DEBUG] loadTransactions INICIO');
        console.log('[DEBUG] loadTransactions llamado');
        const user = authManager.getCurrentUser();
        if (!user) return;

        this.transactions = await dbManager.getRecentTransactions();
        console.log('[DEBUG] Transacciones obtenidas de la base de datos:', this.transactions);
        this.displayTransactions();
    }

    // Mostrar transacciones en la UI
    displayTransactions() {
        console.log('[DEBUG] displayTransactions llamado, transacciones:', this.transactions);
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

        // Mostrar símbolo según la moneda
        let symbol = '$';
        if (transaction.currency === 'VES') symbol = 'Bs';
        else if (transaction.currency === 'EUR') symbol = '€';

        div.innerHTML = `
            <div class="transaction-icon">
                ${this.getCategoryIcon(transaction.category, transaction.type)}
            </div>
            <div class="transaction-details">
                <div class="transaction-description">${transaction.description}</div>
                <div class="transaction-category">${this.getCategoryLabel(transaction.category, transaction.type)} • ${formattedDate}</div>
            </div>
            <div class="transaction-amount ${amountClass}">
                ${sign}${symbol}${transaction.amount.toFixed(2)}
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