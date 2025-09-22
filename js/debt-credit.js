// Instancia global para acceso desde otros scripts
let debtCreditManager;

document.addEventListener('DOMContentLoaded', () => {
    debtCreditManager = new DebtCreditManager();
    window.debtCreditManager = debtCreditManager;
    // Lógica visual para formulario de pago de deuda (Balance Personal)
    const debtCurrency = document.getElementById('debtCurrency');
    const debtPayRateGroup = document.getElementById('debtPayRateGroup');
    if (debtCurrency && debtPayRateGroup) {
        debtCurrency.addEventListener('change', function() {
            if (this.value === 'VES') {
                debtPayRateGroup.style.display = '';
            } else {
                debtPayRateGroup.style.display = 'none';
            }
        });
        // Inicializar visibilidad al cargar
        if (debtCurrency.value === 'VES') {
            debtPayRateGroup.style.display = '';
        } else {
            debtPayRateGroup.style.display = 'none';
        }
    }
    const debtForm = document.getElementById('debtForm');
    if (debtForm) {
        debtForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await debtCreditManager.handleDebtFormSubmit();
        });
    }
    const creditForm = document.getElementById('creditForm');
    if (creditForm) {
        creditForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await debtCreditManager.handleCreditFormSubmit();
        });
            // Lógica visual para moneda/tasa en cobro
            const creditCurrency = document.getElementById('creditCurrency');
            const creditPayRateGroup = document.getElementById('creditPayRateGroup');
            if (creditCurrency && creditPayRateGroup) {
                creditCurrency.addEventListener('change', function() {
                    if (this.value === 'VES') {
                        creditPayRateGroup.style.display = '';
                    } else {
                        creditPayRateGroup.style.display = 'none';
                    }
                });
                // Inicializar visibilidad al cargar
                if (creditCurrency.value === 'VES') {
                    creditPayRateGroup.style.display = '';
                } else {
                    creditPayRateGroup.style.display = 'none';
                }
            }
    }
    // Listeners para botones de Acciones Rápidas
    document.querySelectorAll('button').forEach(btn => {
        if (btn.textContent && btn.textContent.includes('Agregar Nueva Deuda')) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.UI && window.UI.showDebtModal) window.UI.showDebtModal('add');
            });
        }
        if (btn.textContent && btn.textContent.includes('Nuevo Préstamo')) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.UI && window.UI.showCreditModal) window.UI.showCreditModal('add');
            });
        }
    });

    // Listener para botón Registrar Ingreso (pasivo)
    const passiveIncomeBtn = document.getElementById('registerPassiveIncomeBtn');
    if (passiveIncomeBtn) {
        passiveIncomeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = document.getElementById('passiveIncomeModal');
            if (modal) modal.style.display = 'block';
        });
    }
    // Lógica visual para moneda/tasa en ingreso pasivo
    const passiveIncomeCurrency = document.getElementById('passiveIncomeCurrency');
    const passiveIncomeRateGroup = document.getElementById('passiveIncomeRateGroup');
    if (passiveIncomeCurrency && passiveIncomeRateGroup) {
        passiveIncomeCurrency.addEventListener('change', function() {
            if (this.value === 'VES') {
                passiveIncomeRateGroup.style.display = '';
            } else {
                passiveIncomeRateGroup.style.display = 'none';
            }
        });
        // Inicializar visibilidad al cargar
        if (passiveIncomeCurrency.value === 'VES') {
            passiveIncomeRateGroup.style.display = '';
        } else {
            passiveIncomeRateGroup.style.display = 'none';
        }
    }
    // Cerrar modal ingreso pasivo
    const closePassiveIncomeModal = document.getElementById('closePassiveIncomeModal');
    if (closePassiveIncomeModal) {
        closePassiveIncomeModal.onclick = () => {
            document.getElementById('passiveIncomeModal').style.display = 'none';
        };
    }
    // Manejar submit del formulario de ingreso pasivo
    const passiveIncomeForm = document.getElementById('passiveIncomeForm');
    if (passiveIncomeForm) {
        passiveIncomeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = passiveIncomeForm.elements['passiveIncomeName'].value;
            const amountInput = parseFloat(passiveIncomeForm.elements['passiveIncomeAmount'].value);
            const currency = passiveIncomeForm.elements['passiveIncomeCurrency'].value;
            const rate = passiveIncomeForm.elements['passiveIncomeRate'] ? parseFloat(passiveIncomeForm.elements['passiveIncomeRate'].value) : null;
            const date = passiveIncomeForm.elements['passiveIncomeDate'].value;
            const desc = passiveIncomeForm.elements['passiveIncomeDesc'].value;
            let amountUSD = amountInput;
            if (currency === 'VES') {
                if (!rate || rate <= 0) {
                    if (window.UI && window.UI.showError) window.UI.showError('Debes ingresar una tasa válida para ingresos en Bs.');
                    return;
                }
                amountUSD = amountInput / rate;
            }
            // Guardar ingreso pasivo como tarjeta
            if (window.debtCreditManager && typeof window.debtCreditManager.addPassiveIncome === 'function') {
                await window.debtCreditManager.addPassiveIncome({
                    name,
                    amount: amountUSD,
                    currency,
                    date,
                    desc
                });
            }
            passiveIncomeForm.reset();
            document.getElementById('passiveIncomeModal').style.display = 'none';
            if (window.debtCreditManager && typeof window.debtCreditManager.loadAndRender === 'function') {
                await window.debtCreditManager.loadAndRender();
            }
            if (window.UI && window.UI.showSuccess) window.UI.showSuccess('Ingreso pasivo registrado correctamente');
        });
    }
});

// debt-credit.js
// Lógica para gestión de deudas y cobros (Balance Personal)

class DebtCreditManager {
    // Eliminar registro del historial de crédito y refrescar modal
    deleteCreditHistoryRecord(ev, creditId) {
        const index = parseInt(ev.target.dataset.index);
        const credit = this.credits.find(c => c.id === creditId);
        if (!credit || !credit.history || !credit.history[index]) return;
        if (confirm('¿Seguro que quieres eliminar este registro del historial?')) {
            credit.history.splice(index, 1);
            this.updateCredit(creditId, { history: credit.history });
            this.loadAndRender().then(() => {
                this.openCreditHistoryModal({target: {dataset: {id: creditId}}});
            });
        }
    }

    // Eliminar registro del historial de ingreso pasivo y refrescar modal
    deletePassiveIncomeHistoryRecord(ev, incomeId) {
        const index = parseInt(ev.target.dataset.index);
        const income = this.passiveIncomes.find(i => i.id === incomeId);
        if (!income || !income.history || !income.history[index]) return;
        if (confirm('¿Seguro que quieres eliminar este registro del historial?')) {
            income.history.splice(index, 1);
            this.updatePassiveIncome(incomeId, { history: income.history });
            this.loadAndRender().then(() => {
                this.openPassiveIncomeHistoryModal({target: {dataset: {id: incomeId}}});
            });
        }
    }
    openPassiveIncomeHistoryModal(e) {
        const id = e.target.dataset.id;
        const income = this.passiveIncomes.find(i => i.id === id);
        if (!income) return;
        const modal = document.getElementById('passiveIncomeHistoryModal');
        const content = document.getElementById('passiveIncomeHistoryContent');
        let historyHtml = `<div style='color:#00B5D8;font-weight:600; font-size:18px; margin-bottom:10px;'>Historial de ingreso pasivo: ${income.name}</div>`;
        if (income.history && income.history.length) {
            income.history.slice().reverse().forEach((h, histIndex) => {
                const icon = h.type === 'cobro' ? '💸' : '🛒';
                const color = h.type === 'cobro' ? '#00B5D8' : '#38A169';
                historyHtml += `
                <div style="display:flex; align-items:center; background:#F7FAFC; border-radius:8px; box-shadow:0 1px 2px rgba(0,0,0,0.03); padding:12px 18px; margin-bottom:12px;">
                    <div style="font-size:28px; margin-right:16px;">${icon}</div>
                    <div style="flex:1;">
                        <div style="font-size:16px; font-weight:600; color:#2D3748; margin-bottom:2px;">${h.desc}</div>
                        <div style="font-size:14px; color:#4A5568;">${h.type === 'cobro' ? 'Cobro registrado' : 'Aumento de ingreso'}</div>
                        <div style="font-size:13px; color:#A0AEC0; margin-top:2px;">${h.date}</div>
                    </div>
                    <div style="font-size:18px; font-weight:700; color:${color}; margin-left:16px;">${h.type === 'cobro' ? '+' : '+'}$${h.amount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                </div>`;
            });
        } else {
            historyHtml += `<div style='margin-top:12px;'>No hay movimientos registrados aún.</div>`;
        }
        // Eliminar historial previo si existe
        const oldHistory = content.querySelector('.passive-income-history-list');
        if (oldHistory) oldHistory.remove();
        content.insertAdjacentHTML('beforeend', `<div class='passive-income-history-list'>${historyHtml}</div>`);
        modal.style.display = 'block';
        document.getElementById('closePassiveIncomeHistoryModal').onclick = () => {
            modal.style.display = 'none';
        };
    }
    // INGRESOS PASIVOS
    async addPassiveIncome(income) {
        const userId = this.currentUser?.uid;
        if (!userId) return { success: false, error: 'Usuario no autenticado' };
        income.userId = userId;
        income.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        income.type = 'passive_income';
        income.collected = 0;
        income.history = [];
        try {
            const ref = await this.db.collection('passiveIncomes').add(income);
            return { success: true, id: ref.id };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getPassiveIncomes() {
        const userId = this.currentUser?.uid;
        if (!userId) return [];
        const snapshot = await this.db.collection('passiveIncomes').where('userId', '==', userId).get();
        this.passiveIncomes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return this.passiveIncomes;
    }

    async updatePassiveIncome(id, updates) {
        try {
            await this.db.collection('passiveIncomes').doc(id).update(updates);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async deletePassiveIncome(id) {
        try {
            await this.db.collection('passiveIncomes').doc(id).delete();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    openCreditHistoryModal(e) {
        const id = e.target.dataset.id;
        this._currentHistoryCreditId = id;
        const credit = this.credits.find(c => c.id === id);
        if (!credit) return;
        const modal = document.getElementById('creditHistoryModal');
        const content = document.getElementById('creditHistoryContent');
        // Resetear el formulario
        const form = content.querySelector('#addCreditAmountForm');
        if (form) form.reset();
        // Renderizar historial
        let historyHtml = `<div style='color:#2B6CB0;font-weight:600; font-size:18px; margin-bottom:10px;'>Historial del préstamo: ${credit.name}</div>`;
        if (credit.history && credit.history.length) {
            credit.history.slice().reverse().forEach((h, histIndex) => {
                const icon = h.type === 'aumento' ? '🛒' : '💸';
                const color = h.type === 'aumento' ? '#38A169' : '#E53E3E';
                historyHtml += `
                <div style="display:flex; align-items:center; background:#F7FAFC; border-radius:8px; box-shadow:0 1px 2px rgba(0,0,0,0.03); padding:12px 18px; margin-bottom:12px;">
                    <div style="font-size:28px; margin-right:16px;">${icon}</div>
                    <div style="flex:1;">
                        <div style="font-size:16px; font-weight:600; color:#2D3748; margin-bottom:2px;">${h.desc}</div>
                        <div style="font-size:14px; color:#4A5568;">${h.type === 'aumento' ? 'Aumento de préstamo' : 'Cobro registrado'}</div>
                        <div style="font-size:13px; color:#A0AEC0; margin-top:2px;">${h.date}</div>
                    </div>
                    <div style="font-size:18px; font-weight:700; color:${color}; margin-left:16px;">${h.type === 'aumento' ? '+' : '-'}$${h.amount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                </div>`;
            });
        } else {
            historyHtml += `<div style='margin-top:12px;'>No hay movimientos registrados aún.</div>`;
        }
        // Eliminar historial previo si existe
        const oldHistory = content.querySelector('.credit-history-list');
        if (oldHistory) oldHistory.remove();
        // Insertar historial en el contenedor de historial
        content.insertAdjacentHTML('beforeend', `<div class='credit-history-list'>${historyHtml}</div>`);
        modal.style.display = 'block';
        document.getElementById('closeCreditHistoryModal').onclick = () => {
            modal.style.display = 'none';
        };
    }

    openAddCreditAmountModal(e) {
        const id = e.target.dataset.id;
        this._currentHistoryCreditId = id;
        const modal = document.getElementById('addCreditAmountModal');
        const form = document.getElementById('addCreditAmountForm');
        if (form) form.reset();
        modal.style.display = 'block';
        document.getElementById('closeAddCreditAmountModal').onclick = () => {
            modal.style.display = 'none';
        };
        form.onsubmit = async (ev) => {
            ev.preventDefault();
            const amount = parseFloat(form.querySelector('#addCreditAmount').value);
            const date = form.querySelector('#addCreditDate').value;
            const desc = form.querySelector('#addCreditDesc').value;
            if (!amount || !date || !desc) return;
            await this.addCreditAmount(id, amount, date, desc);
            await this.loadAndRender();
            modal.style.display = 'none';
        };
    }

    async addCreditAmount(id, amount, date, desc) {
        // Guardar el aumento en el crédito y en el historial
        const credit = this.credits.find(c => c.id === id);
        if (!credit) return;
        if (!credit.history) credit.history = [];
        credit.history.push({ type: 'aumento', amount, date, desc });
        credit.amount = (credit.amount || 0) + amount;
        await this.updateCredit(id, { amount: credit.amount, history: credit.history });
    }
    editDebtHistoryRecord(ev, debtId) {
        const index = parseInt(ev.target.dataset.index);
        const debt = this.debts.find(d => d.id === debtId);
        if (!debt || !debt.history || !debt.history[index]) return;
        const record = debt.history[index];
        // Mostrar prompt para editar (simple)
        const newAmount = parseFloat(prompt('Nuevo monto:', record.amount));
        const newDesc = prompt('Nueva descripción:', record.desc);
        const newDate = prompt('Nueva fecha:', record.date);
        if (!isNaN(newAmount) && newDesc && newDate) {
            record.amount = newAmount;
            record.desc = newDesc;
            record.date = newDate;
            this.updateDebt(debtId, { history: debt.history });
            this.openDebtHistoryModal({target: {dataset: {id: debtId}}});
        }
    }

    deleteDebtHistoryRecord(ev, debtId) {
        const index = parseInt(ev.target.dataset.index);
        const debt = this.debts.find(d => d.id === debtId);
        if (!debt || !debt.history || !debt.history[index]) return;
        if (confirm('¿Seguro que quieres eliminar este registro del historial?')) {
            debt.history.splice(index, 1);
            this.updateDebt(debtId, { history: debt.history });
            this.loadAndRender().then(() => {
                this.openDebtHistoryModal({target: {dataset: {id: debtId}}});
            });
        }
    }
    // Guardar el id de la deuda actual para el historial
    _currentHistoryDebtId = null;

    openDebtHistoryModal(e) {
        const id = e.target.dataset.id;
        this._currentHistoryDebtId = id;
        const debt = this.debts.find(d => d.id === id);
        if (!debt) return;
        const modal = document.getElementById('debtHistoryModal');
        const content = document.getElementById('debtHistoryContent');
        // Resetear el formulario
        const form = content.querySelector('#addDebtAmountForm');
        if (form) form.reset();
        // Renderizar historial
        let historyHtml = `<div style='color:#2B6CB0;font-weight:600; font-size:18px; margin-bottom:10px;'>Historial de la deuda: ${debt.name}</div>`;
        if (debt.history && debt.history.length) {
            debt.history.slice().reverse().forEach((h, histIndex) => {
                const icon = h.type === 'aumento' ? '🛒' : '💸';
                const color = h.type === 'aumento' ? '#E53E3E' : '#38A169';
                historyHtml += `
                <div style="display:flex; align-items:center; background:#F7FAFC; border-radius:8px; box-shadow:0 1px 2px rgba(0,0,0,0.03); padding:12px 18px; margin-bottom:12px;">
                    <div style="font-size:28px; margin-right:16px;">${icon}</div>
                    <div style="flex:1;">
                        <div style="font-size:16px; font-weight:600; color:#2D3748; margin-bottom:2px;">${h.desc}</div>
                        <div style="font-size:14px; color:#4A5568;">${h.type === 'aumento' ? 'Aumento de deuda' : 'Pago de deuda'}</div>
                        <div style="font-size:13px; color:#A0AEC0; margin-top:2px;">${h.date}</div>
                    </div>
                    <div style="font-size:18px; font-weight:700; color:${color}; margin-left:16px;">${h.type === 'aumento' ? '+' : '-'}$${h.amount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                </div>`;
            });
        } else {
            historyHtml += `<div style='margin-top:12px;'>No hay movimientos registrados aún.</div>`;
        }
        // Listeners para editar/eliminar (siempre)
        setTimeout(() => {
            content.querySelectorAll('.debt-history-edit').forEach(btn => {
                btn.onclick = (ev) => this.editDebtHistoryRecord(ev, id);
            });
            content.querySelectorAll('.debt-history-delete').forEach(btn => {
                btn.onclick = (ev) => this.deleteDebtHistoryRecord(ev, id);
            });
        }, 100);
        // Eliminar historial previo si existe
        const oldHistory = content.querySelector('.debt-history-list');
        if (oldHistory) oldHistory.remove();
        // Insertar historial en el contenedor de historial
        content.insertAdjacentHTML('beforeend', `<div class='debt-history-list'>${historyHtml}</div>`);
        modal.style.display = 'block';
        document.getElementById('closeDebtHistoryModal').onclick = () => {
            modal.style.display = 'none';
        };
    }

    async addDebtAmount(id, amount, date, desc) {
        // Guardar el aumento en la deuda y en el historial
        // Aquí solo lógica local, luego se puede guardar en Firestore
        const debt = this.debts.find(d => d.id === id);
        if (!debt) return;
        // Inicializar historial si no existe
        if (!debt.history) debt.history = [];
        debt.history.push({ type: 'aumento', amount, date, desc });
        debt.amount = (debt.amount || 0) + amount;
        await this.updateDebt(id, { amount: debt.amount, history: debt.history });
    }
    // Renderizado y lógica de UI
    async loadAndRender() {
        const debts = await this.getDebts();
        const credits = await this.getCredits();
        const passiveIncomes = await this.getPassiveIncomes ? await this.getPassiveIncomes() : [];
        this.debts = debts;
        this.credits = credits;
        this.passiveIncomes = passiveIncomes;
        this.renderDebts(debts);
        this.renderCredits(credits);
        this.renderPassiveIncomes(passiveIncomes);
        this.renderDebtSummary(debts);
        this.renderCreditSummary(credits);
        // Actualizar resumen de ingresos pasivos pendientes
        const passiveIncomePendingEl = document.getElementById('passiveIncomePending');
        if (passiveIncomePendingEl) {
            // Sumar todos los ingresos pasivos pendientes (monto - cobrado)
            let totalPending = 0;
            passiveIncomes.forEach(i => {
                totalPending += Math.max(0, (i.amount || 0) - (i.collected || 0));
            });
            passiveIncomePendingEl.textContent = `$${totalPending.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`;
        }
        // Actualizar la tarjeta 'Me Deben' en el dashboard si existe
        if (window.dashboardManager && typeof window.dashboardManager.updateStatsCards === 'function') {
            const finances = window.dashboardManager.stats || {};
            window.dashboardManager.updateStatsCards(finances);
        }
    }
    // Renderizar ingresos pasivos como tarjetas en Me Deben
    renderPassiveIncomes(passiveIncomes) {
        const list = document.getElementById('credit-list');
        if (!list) return;
        // Insertar después de los créditos
        passiveIncomes.forEach(income => {
            const cobrado = income.collected || 0;
            const restante = Math.max(0, (income.amount || 0) - cobrado);
            const porcentaje = income.amount ? Math.min(100, Math.round((cobrado / income.amount) * 100)) : 0;
            const fecha = income.date ? new Date(income.date).toLocaleDateString() : '';
            const symbol = income.currency === 'VES' ? 'Bs ' : '$';
            const item = document.createElement('div');
            item.className = 'pasivo-card';
            item.style = 'background:#F7FAFC; border-radius:8px; padding:20px; margin-bottom:18px; box-shadow:0 1px 2px rgba(0,0,0,0.03);';
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:18px; font-weight:700; color:#2D3748;">${income.name}</div>
                    <span style="background:#00B5D8; color:#fff; font-size:13px; border-radius:6px; padding:2px 10px; font-weight:600;">${restante > 0 ? 'Pendiente' : 'Cobrado'}</span>
                </div>
                <div style="font-size:15px; color:#4A5568; margin-top:4px;">Monto original: <b>${symbol}${(income.amount || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</b></div>
                <div style="font-size:15px; color:#4A5568;">Cobrado: <b>${symbol}${(cobrado).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</b> (${porcentaje}%)</div>
                <div style="margin:10px 0 6px 0; background:#E2E8F0; border-radius:6px; height:12px; width:100%;">
                    <div style="background:#38A169; width:${porcentaje}%; height:100%; border-radius:6px;"></div>
                </div>
                <div style="font-size:14px; color:#00B5D8;">Restante: ${symbol}${restante.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                <div style="font-size:13px; color:#A0AEC0;">Fecha: ${fecha}</div>
                <div style="margin-top:10px; display:flex; gap:8px;">
                    <button class="btn-cobro-pasivo" data-id="${income.id}" style="background:#3182CE; color:#fff; border:none; border-radius:6px; padding:6px 14px; font-size:14px; font-weight:600; cursor:pointer;">Registrar cobro</button>
                    <button class="btn-historial-pasivo" data-id="${income.id}" style="background:#F6E05E; color:#2B6CB0; border:none; border-radius:6px; padding:6px 14px; font-size:14px; font-weight:600; cursor:pointer;">Ver historial</button>
                    <button class="btn-agregar-monto-pasivo" data-id="${income.id}" style="background:#38A169; color:#fff; border:none; border-radius:6px; padding:6px 14px; font-size:14px; font-weight:600; cursor:pointer;">Agregar monto</button>
                    <button class="btn-delete-pasivo" data-id="${income.id}" style="background:#E53E3E; color:#fff; border:none; border-radius:6px; padding:6px 14px; font-size:14px; font-weight:600; cursor:pointer;">Eliminar</button>
                </div>
            `;
            list.appendChild(item);
        });
        // Listeners para botones de gestión de ingreso pasivo (por implementar)
    }

    renderDebts(debts) {
        const list = document.getElementById('debt-list');
        if (!list) return;
        list.innerHTML = '';
        if (!debts.length) {
            list.innerHTML = '<div class="empty">No hay deudas registradas.</div>';
            return;
        }
        const cm = window.currencyManager;
        const moneda = document.getElementById('currencySelect') ? document.getElementById('currencySelect').value : 'USD';
        const base = (window.dashboardManager && window.dashboardManager.stats.baseCurrency) || 'USD';
        const symbol = moneda === 'VES' ? 'Bs ' : (moneda === 'EUR' ? '€' : '$');
        debts.forEach(debt => {
            const pagado = debt.paid || 0;
            const restante = Math.max(0, (debt.amount || 0) - pagado);
            const porcentaje = debt.amount ? Math.min(100, Math.round((pagado / debt.amount) * 100)) : 0;
            const vencimiento = debt.dueDate ? new Date(debt.dueDate).toLocaleDateString() : '';
            // Conversión
            const amountConv = cm ? cm.convert(debt.amount || 0, base, moneda) : (debt.amount || 0);
            const pagadoConv = cm ? cm.convert(pagado, base, moneda) : pagado;
            const restanteConv = cm ? cm.convert(restante, base, moneda) : restante;
            const item = document.createElement('div');
            item.className = 'deuda-card';
            item.style = 'background:#F7FAFC; border-radius:8px; padding:20px; margin-bottom:18px; box-shadow:0 1px 2px rgba(0,0,0,0.03);';
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:18px; font-weight:700; color:#2D3748;">${debt.name}</div>
                    <span style="background:#E53E3E; color:#fff; font-size:13px; border-radius:6px; padding:2px 10px; font-weight:600;">${restante > 0 ? 'Pendiente' : 'Pagado'}</span>
                </div>
                <div style="font-size:15px; color:#4A5568; margin-top:4px;">Monto original: <b>${symbol}${amountConv.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</b></div>
                <div style="font-size:15px; color:#4A5568;">Pagado: <b>${symbol}${pagadoConv.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</b> (${porcentaje}%)</div>
                <div style="margin:10px 0 6px 0; background:#E2E8F0; border-radius:6px; height:12px; width:100%;">
                    <div style="background:#38A169; width:${porcentaje}%; height:100%; border-radius:6px;"></div>
                </div>
                <div style="font-size:14px; color:#E53E3E;">Restante: ${symbol}${restanteConv.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                <div style="font-size:13px; color:#A0AEC0;">Vencimiento: ${vencimiento}</div>
                <div style="margin-top:10px; display:flex; gap:8px;">
                    <button class="btn-pago" data-id="${debt.id}" data-type="debt" style="background:#3182CE; color:#fff; border:none; border-radius:6px; padding:6px 14px; font-size:14px; font-weight:600; cursor:pointer;">Registrar Pago</button>
                    <button class="btn-historial" data-id="${debt.id}" data-type="debt" style="background:#F6E05E; color:#2B6CB0; border:none; border-radius:6px; padding:6px 14px; font-size:14px; font-weight:600; cursor:pointer;">Ver historial</button>
                    <button class="btn-agregar-monto" data-id="${debt.id}" data-type="debt" style="background:#38A169; color:#fff; border:none; border-radius:6px; padding:6px 14px; font-size:14px; font-weight:600; cursor:pointer;">Agregar monto</button>
                    <button class="btn-delete" data-id="${debt.id}" data-type="debt" style="background:#E53E3E; color:#fff; border:none; border-radius:6px; padding:6px 14px; font-size:14px; font-weight:600; cursor:pointer;">Eliminar</button>
                </div>
            `;
            list.appendChild(item);
        });
        // Listeners para editar/eliminar/pago
        list.querySelectorAll('.btn-agregar-monto').forEach(btn => {
            btn.addEventListener('click', (e) => this.openAddDebtAmountModal(e));
        });
        list.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteItem(e, 'debt'));
        });
        list.querySelectorAll('.btn-pago').forEach(btn => {
            btn.addEventListener('click', (e) => this.openPagoModal(e, 'debt'));
        });
        list.querySelectorAll('.btn-historial').forEach(btn => {
            btn.addEventListener('click', (e) => this.openDebtHistoryModal(e));
        });
    }

    openAddDebtAmountModal(e) {
        const id = e.target.dataset.id;
        this._currentHistoryDebtId = id;
        const modal = document.getElementById('addDebtAmountModal');
        const form = document.getElementById('addDebtAmountForm');
        if (form) form.reset();
        modal.style.display = 'block';
        document.getElementById('closeAddDebtAmountModal').onclick = () => {
            modal.style.display = 'none';
        };
        form.onsubmit = async (ev) => {
            ev.preventDefault();
            const amount = parseFloat(form.querySelector('#addDebtAmount').value);
            const date = form.querySelector('#addDebtDate').value;
            const desc = form.querySelector('#addDebtDesc').value;
            if (!amount || !date || !desc) return;
            await this.addDebtAmount(id, amount, date, desc);
            await this.loadAndRender();
            modal.style.display = 'none';
        };
    }

    renderCredits(credits) {
        const list = document.getElementById('credit-list');
        if (!list) return;
        list.innerHTML = '';
        if (!credits.length) {
            list.innerHTML = '<div class="empty">No hay cobros registrados.</div>';
            return;
        }
        const cm = window.currencyManager;
        const moneda = document.getElementById('currencySelect') ? document.getElementById('currencySelect').value : 'USD';
        const base = (window.dashboardManager && window.dashboardManager.stats.baseCurrency) || 'USD';
        const symbol = moneda === 'VES' ? 'Bs ' : (moneda === 'EUR' ? '€' : '$');
        credits.forEach(credit => {
            const devuelto = credit.returned || 0;
            const porCobrar = Math.max(0, (credit.amount || 0) - devuelto);
            const porcentaje = credit.amount ? Math.min(100, Math.round((devuelto / credit.amount) * 100)) : 0;
            const fecha = credit.date ? new Date(credit.date).toLocaleDateString() : '';
            // Conversión
            const amountConv = cm ? cm.convert(credit.amount || 0, base, moneda) : (credit.amount || 0);
            const devueltoConv = cm ? cm.convert(devuelto, base, moneda) : devuelto;
            const porCobrarConv = cm ? cm.convert(porCobrar, base, moneda) : porCobrar;
            const item = document.createElement('div');
            item.className = 'credito-card';
            item.style = 'background:#F7FAFC; border-radius:8px; padding:20px; margin-bottom:18px; box-shadow:0 1px 2px rgba(0,0,0,0.03);';
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:18px; font-weight:700; color:#2D3748;">${credit.name}</div>
                    <span style="background:#ECC94B; color:#fff; font-size:13px; border-radius:6px; padding:2px 10px; font-weight:600;">${porCobrar > 0 ? 'Pendiente' : 'Cobrado'}</span>
                </div>
                <div style="font-size:15px; color:#4A5568; margin-top:4px;">Monto prestado: <b>${symbol}${amountConv.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</b></div>
                <div style="font-size:15px; color:#4A5568;">Devuelto: <b>${symbol}${devueltoConv.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</b> (${porcentaje}%)</div>
                <div style="margin:10px 0 6px 0; background:#E2E8F0; border-radius:6px; height:12px; width:100%;">
                    <div style="background:#38A169; width:${porcentaje}%; height:100%; border-radius:6px;"></div>
                </div>
                <div style="font-size:14px; color:#ECC94B;">Por cobrar: ${symbol}${porCobrarConv.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                <div style="font-size:13px; color:#A0AEC0;">Fecha préstamo: ${fecha}</div>
                <div style="margin-top:10px; display:flex; gap:8px;">
                    <button class="btn-cobro" data-id="${credit.id}" data-type="credit" style="background:#3182CE; color:#fff; border:none; border-radius:6px; padding:6px 14px; font-size:14px; font-weight:600; cursor:pointer;">Registrar Cobro</button>
                    <button class="btn-historial-credit" data-id="${credit.id}" data-type="credit" style="background:#F6E05E; color:#2B6CB0; border:none; border-radius:6px; padding:6px 14px; font-size:14px; font-weight:600; cursor:pointer;">Ver historial</button>
                    <button class="btn-agregar-monto-credit" data-id="${credit.id}" data-type="credit" style="background:#38A169; color:#fff; border:none; border-radius:6px; padding:6px 14px; font-size:14px; font-weight:600; cursor:pointer;">Agregar monto</button>
                    <!-- Botón Editar eliminado -->
                    <button class="btn-delete" data-id="${credit.id}" data-type="credit" style="background:#E53E3E; color:#fff; border:none; border-radius:6px; padding:6px 14px; font-size:14px; font-weight:600; cursor:pointer;">Eliminar</button>
                </div>
            `;
            list.appendChild(item);
        });
        // Listeners para editar/eliminar/cobro/historial/agregar monto
        // Botón Editar eliminado
        list.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteItem(e, 'credit'));
        });
        list.querySelectorAll('.btn-cobro').forEach(btn => {
            btn.addEventListener('click', (e) => this.openPagoModal(e, 'credit'));
        });
        list.querySelectorAll('.btn-historial-credit').forEach(btn => {
            btn.addEventListener('click', (e) => this.openCreditHistoryModal(e));
        });
        list.querySelectorAll('.btn-agregar-monto-credit').forEach(btn => {
            btn.addEventListener('click', (e) => this.openAddCreditAmountModal(e));
        });
    }

    renderDebtSummary(debts) {
        const summary = document.getElementById('debt-summary');
        if (!summary) return;
        const cm = window.currencyManager;
        const moneda = document.getElementById('currencySelect') ? document.getElementById('currencySelect').value : 'USD';
        const base = (window.dashboardManager && window.dashboardManager.stats.baseCurrency) || 'USD';
        const symbol = moneda === 'VES' ? 'Bs ' : (moneda === 'EUR' ? '€' : '$');
        const total = debts.reduce((sum, d) => sum + (d.amount || 0), 0);
        const pagado = debts.reduce((sum, d) => sum + (d.paid || 0), 0);
        const pendiente = Math.max(0, total - pagado);
        const totalConv = cm ? cm.convert(total, base, moneda) : total;
        const pagadoConv = cm ? cm.convert(pagado, base, moneda) : pagado;
        const pendienteConv = cm ? cm.convert(pendiente, base, moneda) : pendiente;
        summary.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px; font-size:18px; font-weight:700; margin-bottom:8px; color:#fff;">
                <span style="font-size:22px;">&#128200;</span> Resumen de Deudas
            </div>
        `;
        // Gráfica doughnut
        const ctx = document.getElementById('deudaChart').getContext('2d');
        if (window.deudaChart && typeof window.deudaChart.destroy === 'function') window.deudaChart.destroy();
        window.deudaChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Pagado', 'Pendiente'],
                datasets: [{
                    data: [pagadoConv, pendienteConv],
                    backgroundColor: ['#38A169', '#E53E3E'],
                    borderWidth: 2,
                    borderColor: '#fff',
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total ? Math.round((value / total) * 100) : 0;
                                return `${context.label}: ${symbol}${value.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        // Leyenda y totales
        summary.innerHTML += `
            <div style="display:flex; justify-content:center; gap:24px; margin-top:12px;">
                <div style="display:flex; align-items:center; gap:6px;"><span style="display:inline-block;width:18px;height:8px;background:#38A169;border-radius:4px;"></span> Pagado</div>
                <div style="display:flex; align-items:center; gap:6px;"><span style="display:inline-block;width:18px;height:8px;background:#E53E3E;border-radius:4px;"></span> Pendiente</div>
            </div>
            <div style="margin-top:18px;">
                <div style="color:#38A169; font-weight:700; font-size:18px; margin-bottom:6px;">&#9679; Pagado: ${symbol}${pagadoConv.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                <div style="color:#E53E3E; font-weight:700; font-size:18px;">&#9679; Pendiente: ${symbol}${pendienteConv.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
            </div>
        `;
    }

    renderCreditSummary(credits) {
        const summary = document.getElementById('credit-summary');
        if (!summary) return;
        const cm = window.currencyManager;
        const moneda = document.getElementById('currencySelect') ? document.getElementById('currencySelect').value : 'USD';
        const base = (window.dashboardManager && window.dashboardManager.stats.baseCurrency) || 'USD';
        const symbol = moneda === 'VES' ? 'Bs ' : (moneda === 'EUR' ? '€' : '$');
        const total = credits.reduce((sum, c) => sum + (c.amount || 0), 0);
        const devuelto = credits.reduce((sum, c) => sum + (c.returned || 0), 0);
        const porCobrar = Math.max(0, total - devuelto);
        const totalConv = cm ? cm.convert(total, base, moneda) : total;
        const devueltoConv = cm ? cm.convert(devuelto, base, moneda) : devuelto;
        const porCobrarConv = cm ? cm.convert(porCobrar, base, moneda) : porCobrar;
        summary.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px; font-size:18px; font-weight:700; margin-bottom:8px; color:#fff;">
                <span style="font-size:22px;">&#128200;</span> Resumen de Cobros
            </div>
        `;
        // Gráfica doughnut
        const ctx = document.getElementById('cobroChart').getContext('2d');
        if (window.cobroChart && typeof window.cobroChart.destroy === 'function') window.cobroChart.destroy();
        window.cobroChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Cobrado', 'Por cobrar'],
                datasets: [{
                    data: [devueltoConv, porCobrarConv],
                    backgroundColor: ['#38A169', '#ECC94B'],
                    borderWidth: 2,
                    borderColor: '#fff',
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total ? Math.round((value / total) * 100) : 0;
                                return `${context.label}: ${symbol}${value.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        // Leyenda y totales
        summary.innerHTML += `
            <div style="display:flex; justify-content:center; gap:24px; margin-top:12px;">
                <div style="display:flex; align-items:center; gap:6px;"><span style="display:inline-block;width:18px;height:8px;background:#38A169;border-radius:4px;"></span> Cobrado</div>
                <div style="display:flex; align-items:center; gap:6px;"><span style="display:inline-block;width:18px;height:8px;background:#ECC94B;border-radius:4px;"></span> Por cobrar</div>
            </div>
            <div style="margin-top:18px;">
                <div style="color:#38A169; font-weight:700; font-size:18px; margin-bottom:6px;">&#9679; Cobrado: ${symbol}${devueltoConv.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                <div style="color:#ECC94B; font-weight:700; font-size:18px;">&#9679; Por cobrar: ${symbol}${porCobrarConv.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
            </div>
        `;
    }

    openEditModal(e, type) {
        if (authManager && authManager.getCurrentUser) {
            this.setCurrentUser(authManager.getCurrentUser());
        }
        this.syncDebtsCredits();
        if (typeof authManager !== 'undefined' && authManager.getCurrentUser) {
            this.setCurrentUser(authManager.getCurrentUser());
        }
        const id = e.target.dataset.id;
        if (type === 'debt') {
            const debt = this.debts.find(d => d.id === id);
            if (!debt) return;
            if (window.UI && window.UI.showDebtModal) window.UI.showDebtModal('edit', debt);
        } else {
            const credit = this.credits.find(c => c.id === id);
            if (!credit) return;
            if (window.UI && window.UI.showCreditModal) window.UI.showCreditModal('edit', credit);
        }
    }

    async handleDebtFormSubmit() {
        if (typeof authManager !== 'undefined' && authManager.getCurrentUser) {
            this.setCurrentUser(authManager.getCurrentUser());
        }
        const form = document.getElementById('debtForm');
        const id = form.elements['debtId'].value;
        const name = form.elements['debtName'].value;
        const amount = parseFloat(form.elements['debtAmount'].value);
        const paidInput = parseFloat(form.elements['debtPaid'].value) || 0;
        const dueDate = form.elements['debtDueDate'].value;
        const mode = form.getAttribute('data-mode');
        const currency = form.elements['debtCurrency'] ? form.elements['debtCurrency'].value : 'USD';
        const rate = form.elements['debtPayRate'] ? parseFloat(form.elements['debtPayRate'].value) : null;
        if (id && mode === 'pago') {
            // Registrar pago: sumar al pagado anterior y guardar en historial
            const debt = this.debts.find(d => d.id === id);
            let montoCaja = paidInput;
            let montoDolar = paidInput;
            if (currency === 'VES') {
                // Si paga en Bs, el usuario ingresa el monto en bolívares y la tasa
                if (!rate || rate <= 0) {
                    window.UI && window.UI.showError && window.UI.showError('Debe ingresar una tasa válida');
                    return;
                }
                montoCaja = paidInput; // Bs
                montoDolar = paidInput / rate; // USD convertido
            }
            let nuevoPagado = (debt.paid || 0) + montoDolar;
            const now = new Date();
            const fecha = now.toISOString().split('T')[0];
            if (currency === 'VES') {
                // Si paga en Bs, el usuario ingresa el monto en bolívares y la tasa
                if (!rate || rate <= 0) {
                    window.UI && window.UI.showError && window.UI.showError('Debe ingresar una tasa válida');
                    return;
                }
                montoCaja = paidInput; // Bs
                montoDolar = paidInput / rate; // USD convertido
            }
            if (!debt.history) debt.history = [];
            debt.history.push({
                type: 'pago',
                amount: montoDolar,
                date: fecha,
                desc: `Pago registrado${currency === 'VES' ? ` en Bs (Tasa: ${rate})` : ''}`
            });
            await this.updateDebt(id, { paid: nuevoPagado, history: debt.history });
            // Registrar transacción en la caja correspondiente
            if (window.transactionsManager) {
                const time = now.toTimeString().slice(0,5);
                console.log('[LOG REGISTRO TRANSACCION DEUDA]', {
                    type: 'expense',
                    amount: montoCaja,
                    currency: currency,
                    rate,
                    montoCaja,
                    montoDolar,
                    descripcion: `Pago de deuda: ${debt.name}` + (currency === 'VES' ? ` (Tasa: ${rate}, equiv. $${montoDolar.toFixed(2)})` : ''),
                    fecha,
                    time
                });
                await window.transactionsManager.handleTransactionSubmitDirect({
                    type: 'expense',
                    amount: montoCaja,
                    currency: currency,
                    category: 'other_expense',
                    description: `Pago de deuda: ${debt.name}` + (currency === 'VES' ? ` (Tasa: ${rate}, equiv. $${montoDolar.toFixed(2)})` : ''),
                    date: fecha,
                    time,
                    rate: currency === 'VES' ? rate : undefined
                });
            }
        } else if (id) {
            // Editar deuda existente
            await this.updateDebt(id, { name, amount, paid: paidInput, dueDate });
        } else {
            // Nueva deuda
            await this.addDebt({ name, amount, paid: paidInput, dueDate });
        }
        form.reset();
        form.removeAttribute('data-mode');
        // Restaurar campos editables
        form.elements['debtName'].readOnly = false;
        form.elements['debtAmount'].readOnly = false;
        form.elements['debtDueDate'].readOnly = false;
        document.getElementById('closeDebtModal').click();
        await this.loadAndRender();
    }

    async handleCreditFormSubmit() {
        const form = document.getElementById('creditForm');
        const id = form.elements['creditId'].value;
        const name = form.elements['creditName'].value;
        const amount = parseFloat(form.elements['creditAmount'].value);
        const returnedInput = parseFloat(form.elements['creditReturned'].value) || 0;
        const date = form.elements['creditDate'].value;
        const mode = form.getAttribute('data-mode');
        const currency = form.elements['creditCurrency'] ? form.elements['creditCurrency'].value : 'USD';
        const rate = form.elements['creditPayRate'] ? parseFloat(form.elements['creditPayRate'].value) : null;
        if (id && mode === 'cobro') {
            // Registrar cobro: sumar al devuelto anterior y guardar en historial
            const credit = this.credits.find(c => c.id === id);
            let montoDolar = 0;
            let montoCaja = 0;
            if (currency === 'USD') {
                montoDolar = returnedInput;
                montoCaja = returnedInput;
            } else if (currency === 'VES') {
                if (!rate || rate <= 0) {
                    if (window.UI && window.UI.showError) window.UI.showError('Debes ingresar una tasa válida para cobros en Bs.');
                    return;
                }
                montoDolar = returnedInput / rate;
                montoCaja = returnedInput;
            }
            const nuevoDevuelto = (credit.returned || 0) + montoDolar;
            // Registrar cobro en historial
            if (!credit.history) credit.history = [];
            const now = new Date();
            const fecha = now.toISOString().split('T')[0];
            credit.history.push({
                type: 'cobro',
                amount: montoDolar,
                date: fecha,
                desc: `Cobro registrado${currency === 'VES' ? ` en Bs (Tasa: ${rate})` : ''}`
            });
            await this.updateCredit(id, { returned: nuevoDevuelto, history: credit.history });
            // Registrar transacción de ingreso
            if (window.transactionsManager) {
                const time = now.toTimeString().slice(0,5);
                await window.transactionsManager.handleTransactionSubmitDirect({
                    type: 'income',
                    amount: montoCaja,
                    currency: currency,
                    category: 'other_income',
                    description: `Cobro de préstamo: ${credit.name}` + (currency === 'VES' ? ` (Tasa: ${rate}, equiv. $${montoDolar.toFixed(2)})` : ''),
                    date: fecha,
                    time,
                    rate: currency === 'VES' ? rate : undefined
                });
            }
        } else if (id) {
            // Editar crédito existente
            await this.updateCredit(id, { name, amount, returned: returnedInput, date });
        } else {
            // Nuevo crédito (préstamo entregado): registrar como egreso
            await this.addCredit({ name, amount, returned: returnedInput, date });
            if (window.transactionsManager) {
                const now = new Date();
                const dateNow = now.toISOString().split('T')[0];
                const time = now.toTimeString().slice(0,5);
                await window.transactionsManager.handleTransactionSubmitDirect({
                    type: 'expense',
                    amount: amount,
                    currency: 'USD',
                    category: 'other_expense',
                    description: `Préstamo entregado: ${name}`,
                    date: dateNow,
                    time
                });
            }
        }
        form.reset();
        form.removeAttribute('data-mode');
        // Restaurar campos editables
        form.elements['creditName'].readOnly = false;
        form.elements['creditAmount'].readOnly = false;
        form.elements['creditDate'].readOnly = false;
        document.getElementById('closeCreditModal').click();
        this.loadAndRender();
    }

    openPagoModal(e, type) {
        if (authManager && authManager.getCurrentUser) {
            this.setCurrentUser(authManager.getCurrentUser());
        }
        this.syncDebtsCredits();
        const id = e.target.dataset.id;
        if (type === 'debt') {
            const debt = this.debts.find(d => d.id === id);
            if (!debt) return;
            if (window.UI && window.UI.showDebtModal) window.UI.showDebtModal('pago', debt);
        } else {
            const credit = this.credits.find(c => c.id === id);
            if (!credit) return;
            if (window.UI && window.UI.showCreditModal) window.UI.showCreditModal('cobro', credit);
        }
    }

    async deleteItem(e, type) {
        // Asegurar usuario actual
        if (authManager && authManager.getCurrentUser) {
            this.setCurrentUser(authManager.getCurrentUser());
        }
        // Sincronizar datos en memoria
        await this.syncDebtsCredits();
        const id = e.target.dataset.id;
        const nombre = type === 'debt' ? 'deuda' : 'cobro';
        if (!confirm(`¿Estás seguro de que quieres eliminar esta ${nombre}?`)) return;
        let result;
        if (type === 'debt') {
            result = await this.deleteDebt(id);
        } else {
            result = await this.deleteCredit(id);
        }
        if (result && result.success) {
            if (window.UI && window.UI.showSuccess) {
                window.UI.showSuccess(`${nombre.charAt(0).toUpperCase() + nombre.slice(1)} eliminada correctamente`);
            }
            await this.loadAndRender();
        } else {
            if (window.UI && window.UI.showError) {
                window.UI.showError(result && result.error ? result.error : `Error al eliminar la ${nombre}`);
            }
        }
    }

    // Sincronizar datos en memoria con Firestore
    async syncDebtsCredits() {
        this.debts = await this.getDebts();
        this.credits = await this.getCredits();
    }
    constructor() {
        this.debts = [];
        this.credits = [];
        this.db = firebase.firestore();
        this.currentUser = null;
    }

    setCurrentUser(user) {
        this.currentUser = user;
    }

    // DEUDAS
    async addDebt(debt) {
        const userId = this.currentUser?.uid;
        if (!userId) return { success: false, error: 'Usuario no autenticado' };
        debt.userId = userId;
        debt.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        debt.type = 'debt';
        try {
            const ref = await this.db.collection('debts').add(debt);
            return { success: true, id: ref.id };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getDebts() {
        const userId = this.currentUser?.uid;
        if (!userId) return [];
        const snapshot = await this.db.collection('debts').where('userId', '==', userId).get();
        this.debts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return this.debts;
    }

    async updateDebt(id, updates) {
        try {
            await this.db.collection('debts').doc(id).update(updates);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async deleteDebt(id) {
        try {
            await this.db.collection('debts').doc(id).delete();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // COBROS
    async addCredit(credit) {
        const userId = this.currentUser?.uid;
        if (!userId) return { success: false, error: 'Usuario no autenticado' };
        credit.userId = userId;
        credit.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        credit.type = 'credit';
        try {
            const ref = await this.db.collection('credits').add(credit);
            return { success: true, id: ref.id };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getCredits() {
        const userId = this.currentUser?.uid;
        if (!userId) return [];
        const snapshot = await this.db.collection('credits').where('userId', '==', userId).get();
        this.credits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return this.credits;
    }

    async updateCredit(id, updates) {
        try {
            await this.db.collection('credits').doc(id).update(updates);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async deleteCredit(id) {
        try {
            await this.db.collection('credits').doc(id).delete();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Instancia global
// Listener para botón Eliminar ingreso pasivo
document.addEventListener('DOMContentLoaded', () => {
    const creditList = document.getElementById('credit-list');
    if (creditList) {
        creditList.addEventListener('click', async function(e) {
            if (e.target.classList.contains('btn-delete-pasivo')) {
                const id = e.target.dataset.id;
                if (confirm('¿Seguro que quieres eliminar este ingreso pasivo?')) {
                    if (window.debtCreditManager && typeof window.debtCreditManager.deletePassiveIncome === 'function') {
                        await window.debtCreditManager.deletePassiveIncome(id);
                        if (window.debtCreditManager.loadAndRender) await window.debtCreditManager.loadAndRender();
                        if (window.UI && window.UI.showSuccess) window.UI.showSuccess('Ingreso pasivo eliminado correctamente');
                    }
                }
            }
            // Abrir modal para agregar monto a ingreso pasivo
            if (e.target.classList.contains('btn-agregar-monto-pasivo')) {
                const id = e.target.dataset.id;
                const modal = document.getElementById('addPassiveIncomeAmountModal');
                const form = document.getElementById('addPassiveIncomeAmountForm');
                if (form) form.reset();
                document.getElementById('addPassiveIncomeAmountId').value = id;
                modal.style.display = 'block';
                document.getElementById('closeAddPassiveIncomeAmountModal').onclick = () => {
                    modal.style.display = 'none';
                };
            }
        });
    }
    // Submit para agregar monto a ingreso pasivo
    const addForm = document.getElementById('addPassiveIncomeAmountForm');
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('addPassiveIncomeAmountId').value;
            const amount = parseFloat(addForm.elements['addPassiveIncomeAmount'].value);
            const date = addForm.elements['addPassiveIncomeDate'].value;
            const desc = addForm.elements['addPassiveIncomeDesc'].value;
            if (!amount || !date || !desc) return;
            // Actualizar ingreso pasivo
            if (window.debtCreditManager && typeof window.debtCreditManager.updatePassiveIncome === 'function') {
                const incomes = window.debtCreditManager.passiveIncomes || [];
                const income = incomes.find(i => i.id === id);
                if (income) {
                    if (!income.history) income.history = [];
                    income.history.push({ type: 'aumento', amount, date, desc });
                    income.amount = (income.amount || 0) + amount;
                    await window.debtCreditManager.updatePassiveIncome(id, { amount: income.amount, history: income.history });
                    if (window.debtCreditManager.loadAndRender) await window.debtCreditManager.loadAndRender();
                    if (window.UI && window.UI.showSuccess) window.UI.showSuccess('Monto agregado correctamente');
                }
            }
            addForm.reset();
            document.getElementById('addPassiveIncomeAmountModal').style.display = 'none';
        });
    }
});
// Listener para botón 'Ver historial' en tarjetas de ingreso pasivo
document.addEventListener('DOMContentLoaded', () => {
    const creditList = document.getElementById('credit-list');
    if (creditList) {
        creditList.addEventListener('click', function(e) {
            if (e.target.classList.contains('btn-historial-pasivo')) {
                if (window.debtCreditManager && typeof window.debtCreditManager.openPassiveIncomeHistoryModal === 'function') {
                    window.debtCreditManager.openPassiveIncomeHistoryModal(e);
                }
            }
        });
    }
});
// Mostrar/ocultar campo de tasa en cobro de ingreso pasivo
document.addEventListener('DOMContentLoaded', () => {
    const passiveIncomeCollectCurrency = document.getElementById('passiveIncomeCollectCurrency');
    const passiveIncomeCollectRateGroup = document.getElementById('passiveIncomeCollectRateGroup');
    if (passiveIncomeCollectCurrency && passiveIncomeCollectRateGroup) {
        passiveIncomeCollectCurrency.addEventListener('change', function() {
            if (this.value === 'VES') {
                passiveIncomeCollectRateGroup.style.display = '';
            } else {
                passiveIncomeCollectRateGroup.style.display = 'none';
            }
        });
        // Inicializar visibilidad al cargar
        if (passiveIncomeCollectCurrency.value === 'VES') {
            passiveIncomeCollectRateGroup.style.display = '';
        } else {
            passiveIncomeCollectRateGroup.style.display = 'none';
        }
    }
});
// Lógica para procesar el cobro en ingreso pasivo
document.addEventListener('DOMContentLoaded', () => {
    const passiveIncomeCollectForm = document.getElementById('passiveIncomeCollectForm');
    if (passiveIncomeCollectForm) {
        passiveIncomeCollectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('passiveIncomeCollectId').value;
            const amountInput = parseFloat(passiveIncomeCollectForm.elements['passiveIncomeCollectAmount'].value);
            const currency = passiveIncomeCollectForm.elements['passiveIncomeCollectCurrency'].value;
            const rate = passiveIncomeCollectForm.elements['passiveIncomeCollectRate'] ? parseFloat(passiveIncomeCollectForm.elements['passiveIncomeCollectRate'].value) : null;
            const date = passiveIncomeCollectForm.elements['passiveIncomeCollectDate'].value;
            const desc = passiveIncomeCollectForm.elements['passiveIncomeCollectDesc'].value;
            let amountUSD = amountInput;
            let amountCaja = amountInput;
            if (currency === 'VES') {
                if (!rate || rate <= 0) {
                    if (window.UI && window.UI.showError) window.UI.showError('Debes ingresar una tasa válida para cobros en Bs.');
                    return;
                }
                amountUSD = amountInput / rate;
                amountCaja = amountInput;
            }
            // Actualizar ingreso pasivo en Firestore
            const manager = window.debtCreditManager;
            if (manager && typeof manager.updatePassiveIncome === 'function') {
                const incomes = manager.passiveIncomes || [];
                const income = incomes.find(i => i.id === id);
                if (income) {
                    const nuevoCobrado = (income.collected || 0) + amountUSD;
                    if (!income.history) income.history = [];
                    income.history.push({
                        type: 'cobro',
                        amount: amountUSD,
                        date,
                        desc: desc + (currency === 'VES' ? ` en Bs (Tasa: ${rate})` : '')
                    });
                    await manager.updatePassiveIncome(id, { collected: nuevoCobrado, history: income.history });
                }
            }
            // Registrar transacción de ingreso
            if (window.transactionsManager) {
                const now = new Date();
                const time = now.toTimeString().slice(0,5);
                await window.transactionsManager.handleTransactionSubmitDirect({
                    type: 'income',
                    amount: amountCaja,
                    currency: currency,
                    category: 'passive_income',
                    description: `Cobro ingreso pasivo: ${desc}` + (currency === 'VES' ? ` (Tasa: ${rate}, equiv. $${amountUSD.toFixed(2)})` : ''),
                    date: date,
                    time,
                    rate: currency === 'VES' ? rate : undefined,
                    passiveIncomeId: id
                });
            }
            passiveIncomeCollectForm.reset();
            document.getElementById('passiveIncomeCollectModal').style.display = 'none';
            if (window.debtCreditManager && typeof window.debtCreditManager.loadAndRender === 'function') {
                await window.debtCreditManager.loadAndRender();
            }
            if (window.UI && window.UI.showSuccess) window.UI.showSuccess('Cobro registrado correctamente');
        });
    }
});
// Listener para botón Registrar cobro en ingreso pasivo
document.addEventListener('DOMContentLoaded', () => {
    const creditList = document.getElementById('credit-list');
    if (creditList) {
        creditList.addEventListener('click', function(e) {
            if (e.target.classList.contains('btn-cobro-pasivo')) {
                const id = e.target.dataset.id;
                const modal = document.getElementById('passiveIncomeCollectModal');
                const form = document.getElementById('passiveIncomeCollectForm');
                if (form) form.reset();
                document.getElementById('passiveIncomeCollectId').value = id;
                modal.style.display = 'block';
                document.getElementById('closePassiveIncomeCollectModal').onclick = () => {
                    modal.style.display = 'none';
                };
            }
        });
    }
});
