        console.log('[LOG CALL updateSummary]', {
            stack: (new Error()).stack,
            thisFilters: this.currentFilters,
            transactionsLength: this.transactions ? this.transactions.length : 0
        });
// transactions-page.js - Versión completa y corregida
class TransactionsPage {
    // Detectar y registrar saldo inicial automáticamente al iniciar un nuevo mes
    async checkAndRegisterInitialBalance() {
        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7); // 'YYYY-MM'
        // Buscar si ya existe una transacción de saldo inicial para este mes
        const transactions = await dbManager.getRecentTransactions(10); // Solo las últimas 10 para eficiencia
        const alreadyRegisteredUSD = transactions.some(t => t.type === 'initial_balance' && t.currency === 'USD' && t.date && t.date.slice(0,7) === currentMonth);
        const alreadyRegisteredVES = transactions.some(t => t.type === 'initial_balance' && t.currency === 'VES' && t.date && t.date.slice(0,7) === currentMonth);
        // Solo registrar si es el primer día del mes y no existe aún
        if (now.getDate() === 1) {
            // Calcular saldo final del mes anterior
            const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const prevMonthStr = prevMonth.toISOString().slice(0, 7);
            const allTransactions = await dbManager.getRecentTransactions(200); // Buscar suficiente historial
            // USD
            if (!alreadyRegisteredUSD) {
                const usdTx = allTransactions.filter(t => t.currency === 'USD' && t.date && t.date.slice(0,7) === prevMonthStr);
                const saldoFinalUSD = usdTx.filter(t => t.type === 'income' || t.type === 'savings').reduce((sum, t) => sum + t.amount, 0)
                    - usdTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                if (saldoFinalUSD !== 0) {
                    await dbManager.addTransaction({
                        type: 'initial_balance',
                        amount: saldoFinalUSD,
                        category: 'initial_balance',
                        description: `Saldo inicial USD mes ${currentMonth}`,
                        date: now.toISOString().slice(0,10),
                        time: now.toTimeString().slice(0,5),
                        currency: 'USD'
                    });
                }
            }
            // VES
            if (!alreadyRegisteredVES) {
                const vesTx = allTransactions.filter(t => t.currency === 'VES' && t.date && t.date.slice(0,7) === prevMonthStr);
                const saldoFinalVES = vesTx.filter(t => t.type === 'income' || t.type === 'savings').reduce((sum, t) => sum + t.amount, 0)
                    - vesTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                if (saldoFinalVES !== 0) {
                    await dbManager.addTransaction({
                        type: 'initial_balance',
                        amount: saldoFinalVES,
                        category: 'initial_balance',
                        description: `Saldo inicial VES mes ${currentMonth}`,
                        date: now.toISOString().slice(0,10),
                        time: now.toTimeString().slice(0,5),
                        currency: 'VES'
                    });
                }
            }
        }
    }
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
    async init() {
        await this.checkAndRegisterInitialBalance();
        this.setupEventListeners();
        this.setupNavigation();
        // No cargar transacciones automáticamente, se cargarán al navegar
    }

    // Configurar event listeners
    setupEventListeners() {
        // Ajuste: Preseleccionar hora actual al abrir el input si el campo está vacío
        const timeInput = document.getElementById('time');
        if (timeInput) {
            timeInput.addEventListener('focus', function() {
                if (!timeInput.value) {
                    const now = new Date();
                    const hh = String(now.getHours()).padStart(2, '0');
                    const min = String(now.getMinutes()).padStart(2, '0');
                    timeInput.value = `${hh}:${min}`;
                }
            });
        }
        // Ajuste: Preseleccionar fecha actual al abrir el calendario si el campo está vacío
        const dateInput = document.getElementById('date');
        if (dateInput) {
            dateInput.addEventListener('focus', function() {
                if (!dateInput.value) {
                    const today = new Date();
                    const yyyy = today.getFullYear();
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    dateInput.value = `${yyyy}-${mm}-${dd}`;
                }
            });
        }
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
                this.updateSummary(); // Actualizar totales automáticamente
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

        // Interceptar el registro de transacciones normales para gastos en VES
        if (window.transactionsManager && typeof window.transactionsManager.handleTransactionSubmitDirect === 'function') {
            // No sobrescribir la lógica de convertedUSD, dejar que transactions.js lo maneje siempre con window.currencyManager
        }
            // Botón para abrir el modal de cambio de caja en la pantalla de transacciones
            const exchangeBtn = document.getElementById('openExchangeModalBtn');
            if (exchangeBtn) {
                exchangeBtn.addEventListener('click', () => {
                    document.getElementById('exchangeModal').style.display = 'block';
                });
            }
            // Cerrar el modal de cambio de caja
            const closeExchangeModal = document.getElementById('closeExchangeModal');
            if (closeExchangeModal) {
                closeExchangeModal.addEventListener('click', () => {
                    document.getElementById('exchangeModal').style.display = 'none';
                    document.getElementById('exchangeForm').reset();
                    document.getElementById('exchangeResult').value = '';
                });
            }
            // Lógica de cálculo automático del monto convertido
            const exchangeForm = document.getElementById('exchangeForm');
            if (exchangeForm) {
                const amountInput = document.getElementById('exchangeAmount');
                const rateInput = document.getElementById('exchangeRate');
                const fromSelect = document.getElementById('exchangeFrom');
                const toSelect = document.getElementById('exchangeTo');
                const resultInput = document.getElementById('exchangeResult');
                function calculateExchange() {
                    const amount = parseFloat(amountInput.value) || 0;
                    const rate = parseFloat(rateInput.value) || 0;
                    const from = fromSelect.value;
                    const to = toSelect.value;
                    let result = '';
                    if (amount > 0 && rate > 0) {
                        if (from === 'usd' && to === 'ves') {
                            result = (amount * rate).toFixed(2) + ' Bs';
                        } else if (from === 'ves' && to === 'usd') {
                            result = (amount / rate).toFixed(2) + ' $';
                        } else {
                            result = 'Seleccione cajas diferentes';
                        }
                    }
                    resultInput.value = result;
                }
                amountInput.addEventListener('input', calculateExchange);
                rateInput.addEventListener('input', calculateExchange);
                fromSelect.addEventListener('change', calculateExchange);
                toSelect.addEventListener('change', calculateExchange);
                fromSelect.addEventListener('change', () => {
                    if (fromSelect.value === toSelect.value) {
                        toSelect.value = fromSelect.value === 'usd' ? 'ves' : 'usd';
                        calculateExchange();
                    }
                });
                toSelect.addEventListener('change', () => {
                    if (fromSelect.value === toSelect.value) {
                        fromSelect.value = toSelect.value === 'usd' ? 'ves' : 'usd';
                        calculateExchange();
                    }
                });
                if (!exchangeForm._listenerAdded) {
                    exchangeForm.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const amount = parseFloat(amountInput.value) || 0;
                        const rate = parseFloat(rateInput.value) || 0;
                        const from = fromSelect.value;
                        const to = toSelect.value;
                        // Usar fecha y hora actual (como estaba antes)
                        const date = new Date().toISOString().split('T')[0];
                        const time = new Date().toTimeString().slice(0,5);
                        let converted = 0;
                        let description = '';
                        if (from === 'usd' && to === 'ves') {
                            converted = amount * rate;
                            description = `Cambio de ${amount} $ a ${converted.toFixed(2)} Bs (Tasa: ${rate})`;
                        } else if (from === 'ves' && to === 'usd') {
                            converted = amount / rate;
                            description = `Cambio de ${amount} Bs a ${converted.toFixed(2)} $ (Tasa: ${rate})`;
                        } else {
                            window.UI && window.UI.showError && window.UI.showError('Seleccione cajas diferentes');
                            return;
                        }
                        if (window.transactionsManager && typeof window.transactionsManager.handleTransactionSubmitDirect === 'function') {
                            // Generar un exchangeId único para ambas transacciones (fuera del if)
                            if (!window._lastExchangeId || window._lastExchangeIdTime !== Date.now()) {
                                window._lastExchangeId = 'exch_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
                                window._lastExchangeIdTime = Date.now();
                            }
                            const exchangeId = window._lastExchangeId;
                            // Registrar en caja origen como gasto
                            let convertedUSD = null;
                            if (from === 'ves' && to === 'usd' && rate > 0) {
                                convertedUSD = amount / rate;
                            }
                            await window.transactionsManager.handleTransactionSubmitDirect({
                                type: 'exchange',
                                amount: amount,
                                category: `${from}_to_${to}`,
                                description: from === 'usd' ? `Cambio de ${amount} $ a ${(amount * rate).toFixed(2)} Bs (Tasa: ${rate})` : `Cambio de ${amount} Bs a ${(amount / rate).toFixed(2)} $ (Tasa: ${rate})`,
                                date: date,
                                time: time,
                                currency: from === 'usd' ? 'USD' : 'VES',
                                exchangeId: exchangeId,
                                convertedUSD: convertedUSD,
                                usedRate: rate
                            });
                            // Registrar en caja destino como ingreso
                            await window.transactionsManager.handleTransactionSubmitDirect({
                                type: 'exchange',
                                amount: from === 'usd' ? amount * rate : amount / rate,
                                category: `${to}_from_${from}`,
                                description: from === 'usd' ? `Recibido de cambio: ${amount} $ a ${(amount * rate).toFixed(2)} Bs (Tasa: ${rate})` : `Recibido de cambio: ${amount} Bs a ${(amount / rate).toFixed(2)} $ (Tasa: ${rate})`,
                                date: date,
                                time: time,
                                currency: to === 'usd' ? 'USD' : 'VES',
                                exchangeId: exchangeId,
                                convertedUSD: from === 'ves' && to === 'usd' && rate > 0 ? amount / rate : null,
                                usedRate: rate
                            });
                        }
                        document.getElementById('exchangeModal').style.display = 'none';
                        exchangeForm.reset();
                        resultInput.value = '';
                    });
                    exchangeForm._listenerAdded = true;
                }
            }
        }
    // Restaurar el método setupNavigation
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
                
            

    // ...existing code...
    

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
            // Actualizar tasa de la API antes de calcular el dashboard
            if (window.currencyManager && window.currencyManager.fetchRates) {
                await window.currencyManager.fetchRates('USD');
            }
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
        // Mostrar en los dos historiales por moneda
        const transactionsListUSD = document.getElementById('transactionsListUSD');
        const transactionsListBs = document.getElementById('transactionsListBs');
        if (transactionsListUSD) transactionsListUSD.innerHTML = '';
        if (transactionsListBs) transactionsListBs.innerHTML = '';

        // Filtrar y mostrar transacciones por moneda
        const usdTransactions = this.filteredTransactions.filter(t => t.currency === 'USD');
        const vesTransactions = this.filteredTransactions.filter(t => t.currency === 'VES');

        if (transactionsListUSD) {
            if (usdTransactions.length === 0) {
                transactionsListUSD.innerHTML = '<p class="no-transactions">No hay transacciones en dólares</p>';
            } else {
                usdTransactions.forEach(transaction => {
                    const transactionElement = this.createTransactionElement(transaction);
                    transactionsListUSD.appendChild(transactionElement);
                });
            }
        }
        if (transactionsListBs) {
            if (vesTransactions.length === 0) {
                transactionsListBs.innerHTML = '<p class="no-transactions">No hay transacciones en bolívares</p>';
            } else {
                vesTransactions.forEach(transaction => {
                    const transactionElement = this.createTransactionElement(transaction);
                    transactionsListBs.appendChild(transactionElement);
                });
            }
        }
    }

    // Crear elemento HTML para una transacción (versión completa)
    createTransactionElement(transaction) {
        const div = document.createElement('div');
        div.className = 'transaction-item-full';
        const isIncome = transaction.type === 'income';
        const isSavings = transaction.type === 'savings';
        // Ajuste para exchange en VES
        let sign = isIncome ? '+' : '-';
        let amountClass = isIncome ? 'positive' : (isSavings ? 'savings' : 'negative');
        if (transaction.type === 'exchange') {
            if (transaction.currency === 'VES') {
                if (transaction.description && transaction.description.toLowerCase().includes('recibido de cambio')) {
                    sign = '+';
                    amountClass = 'positive'; // Recibido de cambio en VES: verde
                } else {
                    sign = '-';
                    amountClass = 'text-danger'; // Enviado VES: rojo
                }
            } else if (transaction.currency === 'USD') {
                if (transaction.description && transaction.description.toLowerCase().includes('recibido de cambio')) {
                    sign = '+';
                    amountClass = 'positive';
                } else {
                    sign = '-';
                    amountClass = 'negative';
                }
            }
        }
        // Conversión de moneda
        let symbol = '$';
        if (transaction.currency === 'VES') symbol = 'Bs ';
        else if (transaction.currency === 'EUR') symbol = '€';
        // El monto se muestra tal cual, sin conversión
        const amountConv = transaction.amount;
        // Formatear fecha y hora
        let formattedDate = '';
        let formattedTime = '';
        if (transaction.date) {
            // Extraer fecha y hora manualmente para evitar desfase de zona horaria
            let datePart = transaction.date;
            let timePart = transaction.time;
            if (transaction.date.includes('T')) {
                const [d, t] = transaction.date.split('T');
                datePart = d;
                timePart = t ? t.slice(0,5) : (transaction.time || '');
            }
            // Formatear fecha a 'DD MMM YYYY'
            const [year, month, day] = datePart.split('-');
            const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
            formattedDate = `${day} ${meses[parseInt(month,10)-1]} ${year}`;
            // Formatear hora a 'HH:mm'
            formattedTime = timePart || '';
            console.log('[LOG HISTORIAL] Usando date/time:', transaction.date, transaction.time, 'formattedDate:', formattedDate, 'formattedTime:', formattedTime, 'id:', transaction.id);
        } else if (transaction.createdAt && transaction.createdAt.toDate) {
            const dateObj = transaction.createdAt.toDate();
            formattedDate = dateObj.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
            formattedTime = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            console.log('[LOG HISTORIAL] Usando createdAt:', dateObj, 'formattedDate:', formattedDate, 'formattedTime:', formattedTime, 'id:', transaction.id);
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
                ${sign}${symbol}${amountConv.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
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
                // Si es exchange y tiene exchangeId, pasar exchangeId
                if (transaction.type === 'exchange' && transaction.exchangeId) {
                    this.deleteTransaction(transaction.id, transaction.exchangeId);
                } else {
                    this.deleteTransaction(transaction.id);
                }
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
            // Buscar la transacción por ID
            const transaction = this.transactions.find(tx => tx.id === transactionId);
            if (transaction && transaction.exchangeId) {
                // Eliminar todas las transacciones con el mismo exchangeId
                const toDelete = this.transactions.filter(tx => tx.exchangeId === transaction.exchangeId);
                for (const tx of toDelete) {
                    await dbManager.deleteTransaction(tx.id);
                }
                UI.showSuccess('Cambio de caja eliminado correctamente');
                this.loadTransactions();
                if (window.dashboardManager) {
                    window.dashboardManager.updateDashboard();
                }
            } else {
                // Sincronizar borrado de pago de deuda
                if (transaction && transaction.type === 'expense' && transaction.description && transaction.description.startsWith('Pago de deuda:')) {
                    // Extraer nombre de la deuda
                    const deudaNombre = transaction.description.replace('Pago de deuda:', '').split('(')[0].trim();
                    // Buscar la deuda por nombre
                    if (window.debtCreditManager && window.debtCreditManager.debts) {
                        const deuda = window.debtCreditManager.debts.find(d => d.name === deudaNombre);
                        if (deuda) {
                            // Restar el pago
                            // Si la transacción es en VES, restar el monto convertido USD
                            let montoRestar = transaction.currency === 'VES' && transaction.convertedUSD ? transaction.convertedUSD : transaction.amount;
                            deuda.paid = (deuda.paid || 0) - montoRestar;
                            if (deuda.paid < 0) deuda.paid = 0;
                            // Eliminar el registro del historial
                            if (deuda.history && deuda.history.length) {
                                // Buscar el registro por tipo 'pago', monto, fecha y descripción
                                const index = deuda.history.findIndex(h => {
                                    if (h.type !== 'pago') return false;
                                    // Normalizar fechas a formato YYYY-MM-DD
                                    const normalizeDate = d => {
                                        if (!d) return '';
                                        const parts = d.split('-');
                                        return parts.length === 3 ? `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}` : d;
                                    };
                                    const hDateNorm = normalizeDate(h.date);
                                    const tDateNorm = normalizeDate(transaction.date);
                                    // Logs detallados
                                    console.log('[DEPURACION BORRADO]', {
                                        hAmount: h.amount,
                                        tAmount: transaction.amount,
                                        tConvertedUSD: transaction.convertedUSD,
                                        hDate: h.date,
                                        tDate: transaction.date,
                                        hDateNorm,
                                        tDateNorm,
                                        hDesc: h.desc,
                                        tDesc: transaction.description
                                    });
                                    const matchUSD = Math.abs(h.amount - transaction.amount) < 0.05;
                                    const matchVES = transaction.currency === 'VES' && transaction.convertedUSD && Math.abs(h.amount - transaction.convertedUSD) < 0.05;
                                    const matchFecha = hDateNorm === tDateNorm;
                                    // Probar sin descripción para depuración
                                    const result = (matchUSD || matchVES) && matchFecha;
                                    console.log('[BORRADO HISTORIAL DEUDA]', {h, transaction, matchUSD, matchVES, matchFecha, result});
                                    return result;
                                });
                                if (index !== -1) {
                                    console.log('[BORRADO] Eliminando registro de historial de deuda:', deuda.history[index]);
                                    deuda.history.splice(index, 1);
                                } else {
                                    console.warn('[BORRADO] No se encontró registro en historial de deuda para la transacción:', transaction);
                                }
                            }
                            await window.debtCreditManager.updateDebt(deuda.id, { paid: deuda.paid, history: deuda.history });
                            await window.debtCreditManager.loadAndRender();
                        }
                    }
                }
                    // Sincronizar borrado de cobro de préstamo
                    if (transaction && transaction.type === 'income' && transaction.description && transaction.description.startsWith('Cobro de préstamo:')) {
                        const nombrePrestamo = transaction.description.replace('Cobro de préstamo:', '').split('(')[0].trim();
                        if (window.debtCreditManager && window.debtCreditManager.credits) {
                            const prestamo = window.debtCreditManager.credits.find(c => c.name === nombrePrestamo);
                            if (prestamo) {
                                prestamo.returned = (prestamo.returned || 0) - transaction.amount;
                                if (prestamo.returned < 0) prestamo.returned = 0;
                                if (prestamo.history && prestamo.history.length) {
                                    const index = prestamo.history.findIndex(h => {
                                        if (h.type !== 'cobro') return false;
                                        const matchUSD = Math.abs(h.amount - transaction.amount) < 0.01;
                                        const matchVES = transaction.currency === 'VES' && transaction.convertedUSD && Math.abs(h.amount - transaction.convertedUSD) < 0.01;
                                        return matchUSD || matchVES;
                                    });
                                    if (index !== -1) {
                                        prestamo.history.splice(index, 1);
                                    }
                                }
                                await window.debtCreditManager.updateCredit(prestamo.id, { returned: prestamo.returned, history: prestamo.history });
                                await window.debtCreditManager.loadAndRender();
                            }
                        }
                    }
                    // Sincronizar borrado de cobro de ingreso pasivo
                    if (transaction && transaction.type === 'income' && transaction.category === 'passive_income') {
                        if (window.debtCreditManager && window.debtCreditManager.passiveIncomes) {
                            let ingreso = null;
                            if (transaction.passiveIncomeId) {
                                ingreso = window.debtCreditManager.passiveIncomes.find(i => i.id === transaction.passiveIncomeId);
                            }
                            if (!ingreso) {
                                ingreso = window.debtCreditManager.passiveIncomes.find(i => transaction.description.includes(i.desc));
                            }
                            if (!ingreso) {
                                ingreso = window.debtCreditManager.passiveIncomes.find(i => transaction.description.includes(i.name));
                            }
                            if (ingreso) {
                                console.log('[BORRADO PASIVO] Ingreso pasivo encontrado:', ingreso.name, ingreso.id);
                                ingreso.collected = (ingreso.collected || 0) - transaction.amount;
                                if (ingreso.collected < 0) ingreso.collected = 0;
                                if (ingreso.history && ingreso.history.length) {
                                    const index = ingreso.history.findIndex(h => {
                                        if (h.type !== 'cobro') return false;
                                        let matchMonto = false;
                                        let montoHist = h.amount;
                                        let montoTx = transaction.currency === 'VES' ? transaction.convertedUSD : transaction.amount;
                                        if (transaction.currency === 'VES') {
                                            matchMonto = montoTx && Math.abs(montoHist - montoTx) < 0.05;
                                        } else {
                                            matchMonto = Math.abs(montoHist - montoTx) < 0.05;
                                        }
                                        const matchDate = h.date === transaction.date;
                                        console.log('[BORRADO PASIVO][COMPARACION]', {
                                            montoHist,
                                            montoTx,
                                            tasaTx: transaction.rate,
                                            tasaHist: h.desc,
                                            fechaHist: h.date,
                                            fechaTx: transaction.date,
                                            resultado: matchMonto && matchDate
                                        });
                                        return matchMonto && matchDate;
                                    });
                                    if (index !== -1) {
                                        console.log('[BORRADO PASIVO] Eliminando registro de historial:', ingreso.history[index]);
                                        ingreso.history.splice(index, 1);
                                    } else {
                                        console.log('[BORRADO PASIVO] No se encontró coincidencia exacta en historial para borrar.');
                                    }
                                }
                                await window.debtCreditManager.updatePassiveIncome(ingreso.id, { collected: ingreso.collected, history: ingreso.history });
                                await window.debtCreditManager.loadAndRender();
                            } else {
                                console.log('[BORRADO PASIVO] No se encontró ingreso pasivo para la transacción:', transaction);
                            }
                        }
                    }
                // Eliminar la transacción normal
                const result = await dbManager.deleteTransaction(transactionId);
                if (result && result.success) {
                    UI.showSuccess('Transacción eliminada correctamente');
                    this.loadTransactions(); // Recargar transacciones
                    if (window.dashboardManager) {
                        window.dashboardManager.updateDashboard();
                    }
                } else if (result && result.error) {
                    UI.showError(result.error);
                } else {
                    UI.showError('Error desconocido al eliminar la transacción');
                }
            }
        } catch (error) {
            console.error('Error eliminando transacción:', error);
            UI.showError('Error al eliminar la transacción');
        }
    }

    // Lógica de transferencia eliminada

    // Actualizar resumen por moneda con filtro mensual
    updateSummary() {
        // Eliminar log antes de inicializar variables para evitar ReferenceError
        // Log de la tasa obtenida de la API
        if (window.currencyManager && window.currencyManager.rates) {
            console.log('[LOG TASA API] VES:', window.currencyManager.rates['VES'], 'USD:', window.currencyManager.rates['USD']);
        }
        // Si hay filtro de mes, usar solo transacciones de ese mes
        let filtered = this.transactions;
        if (this.currentFilters.month) {
            filtered = filtered.filter(t => {
                const transactionDate = new Date(t.date);
                const transactionMonth = transactionDate.toISOString().slice(0, 7);
                return transactionMonth === this.currentFilters.month;
            });
        }

        // Cálculo principal de subtotales y logs de depuración
        const totalIncomeUSD = filtered.filter(t => t.type === 'income' && t.currency === 'USD').reduce((sum, t) => sum + t.amount, 0);
        const totalExpenseUSD = filtered.filter(t => t.type === 'expense' && t.currency === 'USD').reduce((sum, t) => sum + t.amount, 0);
        const totalSavingsUSD = filtered.filter(t => t.type === 'savings' && t.currency === 'USD').reduce((sum, t) => sum + t.amount, 0);
        const totalIncomeVES = filtered.filter(t => t.type === 'income' && t.currency === 'VES').reduce((sum, t) => sum + t.amount, 0);
        const totalExpenseVES = filtered.filter(t => t.type === 'expense' && t.currency === 'VES').reduce((sum, t) => sum + t.amount, 0);
        const totalSavingsVES = filtered.filter(t => t.type === 'savings' && t.currency === 'VES').reduce((sum, t) => sum + t.amount, 0);

        console.log('[DEBUG] Subtotales antes de exchange:', {
            totalIncomeUSD, totalExpenseUSD, totalSavingsUSD,
            totalIncomeVES, totalExpenseVES, totalSavingsVES
        });
        let subtotalUSD = totalIncomeUSD - totalExpenseUSD + totalSavingsUSD;
        let subtotalVES = totalIncomeVES - totalExpenseVES + totalSavingsVES;
        // Log para depurar el valor original de la caja VES antes de exchange
        if (window.currencyManager && window.currencyManager.rates) {
            const tasaActual = window.currencyManager.rates['VES'];
            const subtotalVESaUSD = tasaActual ? subtotalVES / tasaActual : subtotalVES;
            console.log('[LOG VES ORIGINAL ANTES DE EXCHANGE]', {
                subtotalVES,
                tasaActual,
                subtotalVESaUSD,
                mostrado: '$' + subtotalVESaUSD.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})
            });
        }
            // Log de subtotales iniciales antes de exchange
            console.log('[LOG SUBTOTALES INICIALES]', {
                subtotalUSD,
                subtotalVES
            });
        filtered.filter(t => t.type === 'exchange').forEach(t => {
            console.log('[LOG EXCHANGE] Antes:', {
                subtotalUSD,
                subtotalVES,
                exchange: t
            });
            if (t.currency === 'USD' && t.category && t.category.includes('_to_ves')) {
                subtotalUSD -= t.amount;
                console.log('[LOG EXCHANGE] USD a VES, restando de USD:', t.amount, 'Nuevo subtotalUSD:', subtotalUSD);
            }
            if (t.currency === 'VES' && t.category && t.category.includes('_from_usd')) {
                subtotalVES += t.amount;
                console.log('[LOG EXCHANGE] USD a VES, sumando a VES:', t.amount, 'Nuevo subtotalVES:', subtotalVES);
            }
            if (t.currency === 'VES' && t.category && t.category.includes('_to_usd')) {
                subtotalVES -= t.amount;
                console.log('[LOG EXCHANGE] VES a USD, restando de VES:', t.amount, 'Nuevo subtotalVES:', subtotalVES);
            }
            if (t.currency === 'USD' && t.category && t.category.includes('_from_ves')) {
                subtotalUSD += t.amount;
                console.log('[LOG EXCHANGE] VES a USD, sumando a USD:', t.amount, 'Nuevo subtotalUSD:', subtotalUSD);
            }
            console.log('[LOG EXCHANGE] Después:', {
                subtotalUSD,
                subtotalVES,
                exchange: t
            });
        });
            // Log de subtotales finales después de procesar los exchange
            console.log('[LOG SUBTOTALES FINALES POST-EXCHANGE]', {
                subtotalUSD,
                subtotalVES
            });
            console.log('[DEBUG] Subtotales después de exchange:', {subtotalUSD, subtotalVES});
        // LOG para conversión VES a USD en el balance total (solo una vez)
        if (!window._balanceLogDone) {
            const cm = window.currencyManager;
            const subtotalVEStoUSD = cm ? cm.convert(subtotalVES, 'VES', 'USD') : subtotalVES;
            const realTotalUSD = subtotalUSD + subtotalVEStoUSD;
            console.log('[DEBUG] Balance Total:', {
                subtotalUSD,
                subtotalVES,
                subtotalVEStoUSD,
                realTotalUSD
            });
            window._balanceLogDone = true;
        }

        // Actualizar tarjetas USD
        const totalIncomeElement = document.getElementById('totalIncomeSummary');
        const totalExpenseElement = document.getElementById('totalExpenseSummary');
        const totalSavingsElement = document.getElementById('totalSavingsSummary');
        if (totalIncomeElement) {
            totalIncomeElement.textContent = '$' + totalIncomeUSD.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
        }
        if (totalExpenseElement) {
            totalExpenseElement.textContent = '$' + totalExpenseUSD.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
        }
        // Mostrar saldo calculado de la caja USD
        if (totalSavingsElement) {
            totalSavingsElement.textContent = '$' + subtotalUSD.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
        }
        // Actualizar nombre de la tarjeta
        const totalSavingsTitle = totalSavingsElement?.previousElementSibling;
        if (totalSavingsTitle && totalSavingsTitle.tagName === 'H3') {
            totalSavingsTitle.textContent = 'Total Dólares ($)';
        }

        // Actualizar tarjetas VES
        const totalIncomeElementBs = document.getElementById('totalIncomeSummaryBs');
        const totalExpenseElementBs = document.getElementById('totalExpenseSummaryBs');
        const totalSavingsElementBs = document.getElementById('totalSavingsSummaryBs');
        if (totalIncomeElementBs) {
            totalIncomeElementBs.textContent = 'Bs ' + totalIncomeVES.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
        }
        if (totalExpenseElementBs) {
            totalExpenseElementBs.textContent = 'Bs ' + totalExpenseVES.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
        }
        // Mostrar saldo calculado de la caja VES
        if (totalSavingsElementBs) {
            totalSavingsElementBs.textContent = 'Bs ' + subtotalVES.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
        }
        // Actualizar nombre de la tarjeta
        const totalSavingsTitleBs = totalSavingsElementBs?.previousElementSibling;
        if (totalSavingsTitleBs && totalSavingsTitleBs.tagName === 'H3') {
            totalSavingsTitleBs.textContent = 'Total Bolívares (Bs)';
        }

            // --- Ajuste: Balance Total en dashboard ---
            const balanceTotalElement = document.getElementById('balanceTotal');
            // Usar los subtotales finales después de exchange para el Balance Total
            const cm = window.currencyManager;
            let tasaActual = cm && cm.rates && cm.rates['VES'] ? cm.rates['VES'] : null;
            let subtotalVEStoUSD_final = (tasaActual && tasaActual > 0) ? (subtotalVES / tasaActual) : subtotalVES;
            let realTotalUSD_final = subtotalUSD + subtotalVEStoUSD_final;
            console.log('[LOG BALANCE TOTAL FINAL]', {
                subtotalUSD,
                subtotalVES,
                tasaActual,
                subtotalVEStoUSD_final,
                realTotalUSD_final
            });
            if (balanceTotalElement) {
                console.log('[LOG FINAL DOM BALANCE TOTAL]', {
                    realTotalUSD_final,
                    mostrado: '$' + realTotalUSD_final.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})
                });
                balanceTotalElement.textContent = '$' + realTotalUSD_final.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
            }
    }

    // Actualizar balance disponible - CORREGIDO (IDs duplicados)
    updateAvailableBalance() {
        const finances = dbManager.getCurrentFinances();
        const cm = window.currencyManager;
        const moneda = document.getElementById('currencySelect') ? document.getElementById('currencySelect').value : 'USD';
        const base = (window.dashboardManager && window.dashboardManager.stats.baseCurrency) || 'USD';
        const symbol = moneda === 'VES' ? 'Bs ' : (moneda === 'EUR' ? '€' : '$');
        const balanceConv = cm ? cm.convert(finances.totalBalance, base, moneda) : finances.totalBalance;
        const balanceElement = document.getElementById('availableBalance');
        const modalBalanceElement = document.getElementById('availableBalanceModal');
        if (balanceElement) {
            balanceElement.textContent = symbol + balanceConv.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
        }
        if (modalBalanceElement) {
            modalBalanceElement.textContent = symbol + balanceConv.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
        }
    }
// ...existing code...
}
// Instancia global de la página de transacciones
const transactionsPage = new TransactionsPage();
window.transactionsPage = transactionsPage;
console.log('[DEBUG] window.transactionsPage inicializada:', window.transactionsPage);
// Inicializar cuando la aplicación esté lista
document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que la aplicación esté completamente cargada
    setTimeout(() => {
        if (typeof window.transactionsPage !== 'undefined') {
            window.transactionsPage.init();
        } else {
            console.error('[ERROR] window.transactionsPage no está definida');
        }
    }, 1000);
});