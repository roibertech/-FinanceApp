// transactions-page.js - Versión completa y corregida
class TransactionsPage {
    constructor() {
        this.currentPage = 'dashboard';
        this.transactions = [];
        this.filteredTransactions = [];
        this.currentFilters = {
            type: 'all',
            category: 'all',
            month: ''
        };
    }

    // Inicializar la página de transacciones
    init() {
        this.setupEventListeners();
        this.setupNavigation();
        // No cargar transacciones automáticamente, se cargarán al navegar
    }

    // Configurar event listeners
    setupEventListeners() {
        // Filtros
        const typeFilter = document.getElementById('transactionTypeFilter');
        const categoryFilter = document.getElementById('transactionCategoryFilter');
        const monthFilter = document.getElementById('transactionMonthFilter');
        
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.currentFilters.type = e.target.value;
                this.applyFilters();
            });
        }
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentFilters.category = e.target.value;
                this.applyFilters();
            });
        }
        
        if (monthFilter) {
            monthFilter.addEventListener('change', (e) => {
                this.currentFilters.month = e.target.value;
                this.applyFilters();
            });
        }

        // Botón de añadir transacción desde la página
        const addBtn = document.getElementById('addTransactionBtnPage');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                if (window.transactionsManager) {
                    window.transactionsManager.showTransactionModal();
                }
            });
        }

        // Ver todas las transacciones desde el dashboard
        const viewAllBtn = document.getElementById('viewAllTransactions');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo('transactions');
            });
        }

        // Lógica de transferencia eliminada
    }

    // Configurar navegación entre páginas
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item[data-page]');
        
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                this.navigateTo(page);
            });
        });
    }

    // Navegar a una página específica
    navigateTo(page) {
        // Ocultar todas las páginas
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        // Desactivar todos los items del menú
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Mostrar la página seleccionada
        const pageElement = document.getElementById(`${page}-page`);
        if (pageElement) {
            pageElement.classList.add('active');
        }

        // Activar el item del menú
        const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }

        // Cargar datos específicos de la página
        if (page === 'transactions') {
            this.loadTransactions();
            this.updateAvailableBalance();
        }

        this.currentPage = page;
    }

    // Cargar transacciones
    async loadTransactions() {
        try {
            this.transactions = await dbManager.getRecentTransactions(100); // Obtener más transacciones
            this.applyFilters();
            this.updateSummary();
            this.updateAvailableBalance();
        } catch (error) {
            console.error('Error cargando transacciones:', error);
        }
    }

    // Aplicar filtros
    applyFilters() {
        this.filteredTransactions = this.transactions.filter(transaction => {
            // Filtrar por tipo
            if (this.currentFilters.type !== 'all' && transaction.type !== this.currentFilters.type) {
                return false;
            }

            // Filtrar por categoría
            if (this.currentFilters.category !== 'all' && transaction.category !== this.currentFilters.category) {
                return false;
            }

            // Filtrar por mes
            if (this.currentFilters.month) {
                const transactionDate = new Date(transaction.date);
                const transactionMonth = transactionDate.toISOString().slice(0, 7);
                if (transactionMonth !== this.currentFilters.month) {
                    return false;
                }
            }

            return true;
        });

        this.displayTransactions();
    }

    // Mostrar transacciones en la página
    displayTransactions() {
        const transactionsList = document.getElementById('fullTransactionsList');
        if (!transactionsList) return;
        
        transactionsList.innerHTML = '';

        if (this.filteredTransactions.length === 0) {
            transactionsList.innerHTML = `
                <div class="no-transactions">
                    <p>No hay transacciones que coincidan con los filtros</p>
                </div>
            `;
            return;
        }

        this.filteredTransactions.forEach(transaction => {
            const transactionElement = this.createTransactionElement(transaction);
            transactionsList.appendChild(transactionElement);
        });
    }

    // Crear elemento HTML para una transacción (versión completa)
    createTransactionElement(transaction) {

        const div = document.createElement('div');
        div.className = 'transaction-item-full';

        const isIncome = transaction.type === 'income';
        const isSavings = transaction.type === 'savings';
        const sign = isIncome ? '+' : '-';
        const amountClass = isIncome ? 'positive' : (isSavings ? 'savings' : 'negative');

        // Formatear fecha y hora
        let formattedDate = '';
        let formattedTime = '';
        if (transaction.createdAt && transaction.createdAt.toDate) {
            const dateObj = transaction.createdAt.toDate();
            formattedDate = dateObj.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
            formattedTime = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        } else {
            const date = new Date(transaction.date);
            formattedDate = date.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
            formattedTime = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        }

        div.innerHTML = `
            <div class="transaction-icon-full">
                ${transactionsManager.getCategoryIcon(transaction.category, transaction.type)}
            </div>
            <div class="transaction-details-full">
                <div class="transaction-description-full">${transaction.description}</div>
                <div class="transaction-category-full">${transactionsManager.getCategoryLabel(transaction.category, transaction.type)}</div>
                <div class="transaction-date-full">${formattedDate} <span style="color:#CBD5E0;">|</span> <span style="font-size:11px;">${formattedTime}</span></div>
            </div>
            <div class="transaction-amount-full ${amountClass}">
                ${sign}$${transaction.amount.toFixed(2)}
            </div>
            <div class="transaction-actions">
                <button class="btn-icon edit" data-id="${transaction.id}">
                    <span>✏️</span>
                </button>
                <button class="btn-icon delete" data-id="${transaction.id}">
                    <span>🗑️</span>
                </button>
            </div>
        `;

        // Agregar event listeners para editar y eliminar
        const editBtn = div.querySelector('.btn-icon.edit');
        const deleteBtn = div.querySelector('.btn-icon.delete');
        
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editTransaction(transaction.id);
            });
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteTransaction(transaction.id);
            });
        }

        return div;
    }

    // Editar transacción
    async editTransaction(transactionId) {
        try {
            const transaction = this.transactions.find(t => t.id === transactionId);
            if (!transaction) return;

            // Llenar el modal con los datos de la transacción
            document.getElementById('transactionModalTitle').textContent = 'Editar Transacción';
            document.getElementById('transactionId').value = transaction.id;
            document.getElementById('type').value = transaction.type;
            document.getElementById('amount').value = transaction.amount;
            document.getElementById('description').value = transaction.description;
            document.getElementById('date').value = transaction.date;

            // Cargar categorías según el tipo
            transactionsManager.loadCategoryOptions(transaction.type);
            
            // Establecer la categoría después de cargar las opciones
            setTimeout(() => {
                document.getElementById('category').value = transaction.category;
            }, 100);

            // Mostrar botón de eliminar
            document.getElementById('transactionDeleteBtn').style.display = 'block';

            // Mostrar modal
            UI.showTransactionModal();
        } catch (error) {
            console.error('Error editando transacción:', error);
            UI.showError('Error al cargar la transacción para editar');
        }
    }

    // Eliminar transacción
    async deleteTransaction(transactionId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta transacción?')) {
            return;
        }

        try {
            // Eliminar la transacción
            const result = await dbManager.deleteTransaction(transactionId);
            
            if (result.success) {
                UI.showSuccess('Transacción eliminada correctamente');
                this.loadTransactions(); // Recargar transacciones
                
                // Actualizar dashboard
                if (window.dashboardManager) {
                    window.dashboardManager.updateDashboard();
                }
            } else {
                UI.showError(result.error);
            }
        } catch (error) {
            console.error('Error eliminando transacción:', error);
            UI.showError('Error al eliminar la transacción');
        }
    }

    // Lógica de transferencia eliminada

    // Actualizar resumen
    updateSummary() {
        const totalIncome = this.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = this.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalSavings = this.transactions
            .filter(t => t.type === 'savings')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalIncomeElement = document.getElementById('totalIncomeSummary');
        const totalExpenseElement = document.getElementById('totalExpenseSummary');
        const totalSavingsElement = document.getElementById('totalSavingsSummary');
        
        if (totalIncomeElement) {
            totalIncomeElement.textContent = `$${totalIncome.toFixed(2)}`;
        }
        if (totalExpenseElement) {
            totalExpenseElement.textContent = `$${totalExpense.toFixed(2)}`;
        }
        if (totalSavingsElement) {
            totalSavingsElement.textContent = `$${totalSavings.toFixed(2)}`;
        }
    }

    // Actualizar balance disponible - CORREGIDO (IDs duplicados)
    updateAvailableBalance() {
        const finances = dbManager.getCurrentFinances();
        const balanceElement = document.getElementById('availableBalance');
        const modalBalanceElement = document.getElementById('availableBalanceModal');
        
        if (balanceElement) {
            balanceElement.textContent = `$${finances.totalBalance.toFixed(2)}`;
        }
        if (modalBalanceElement) {
            modalBalanceElement.textContent = `$${finances.totalBalance.toFixed(2)}`;
        }
    }
}

// Instancia global de la página de transacciones
const transactionsPage = new TransactionsPage();

// Inicializar cuando la aplicación esté lista
document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que la aplicación esté completamente cargada
    setTimeout(() => {
        if (typeof transactionsPage !== 'undefined') {
            transactionsPage.init();
        }
    }, 1000);
});