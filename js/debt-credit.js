// Instancia global para acceso desde otros scripts
let debtCreditManager;

document.addEventListener('DOMContentLoaded', () => {
    debtCreditManager = new DebtCreditManager();
    window.debtCreditManager = debtCreditManager;
    // Listeners para formularios
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
});

// debt-credit.js
// Lógica para gestión de deudas y cobros (Balance Personal)

class DebtCreditManager {
    // Renderizado y lógica de UI
    async loadAndRender() {
        const debts = await this.getDebts();
        const credits = await this.getCredits();
        this.debts = debts;
        this.credits = credits;
        this.renderDebts(debts);
        this.renderCredits(credits);
        this.renderDebtSummary(debts);
        this.renderCreditSummary(credits);
        // Actualizar la tarjeta 'Me Deben' en el dashboard si existe
        if (window.dashboardManager && typeof window.dashboardManager.updateStatsCards === 'function') {
            const finances = window.dashboardManager.stats || {};
            window.dashboardManager.updateStatsCards(finances);
        }
    }

    renderDebts(debts) {
        const list = document.getElementById('debt-list');
        if (!list) return;
        list.innerHTML = '';
        if (!debts.length) {
            list.innerHTML = '<div class="empty">No hay deudas registradas.</div>';
            return;
        }
        debts.forEach(debt => {
            const pagado = debt.paid || 0;
            const restante = Math.max(0, (debt.amount || 0) - pagado);
            const porcentaje = debt.amount ? Math.min(100, Math.round((pagado / debt.amount) * 100)) : 0;
            const vencimiento = debt.dueDate ? new Date(debt.dueDate).toLocaleDateString() : '';
            const item = document.createElement('div');
            item.className = 'deuda-card';
            item.style = 'background:#F7FAFC; border-radius:8px; padding:20px; margin-bottom:18px; box-shadow:0 1px 2px rgba(0,0,0,0.03);';
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:18px; font-weight:700; color:#2D3748;">${debt.name}</div>
                    <span style="background:#E53E3E; color:#fff; font-size:13px; border-radius:6px; padding:2px 10px; font-weight:600;">${restante > 0 ? 'Pendiente' : 'Pagado'}</span>
                </div>
                <div style="font-size:15px; color:#4A5568; margin-top:4px;">Monto original: <b>$${(debt.amount||0).toFixed(2)}</b></div>
                <div style="font-size:15px; color:#4A5568;">Pagado: <b>$${pagado.toFixed(2)}</b> (${porcentaje}%)</div>
                <div style="margin:10px 0 6px 0; background:#E2E8F0; border-radius:6px; height:12px; width:100%;">
                    <div style="background:#38A169; width:${porcentaje}%; height:100%; border-radius:6px;"></div>
                </div>
                <div style="font-size:14px; color:#E53E3E;">Restante: $${restante.toFixed(2)}</div>
                <div style="font-size:13px; color:#A0AEC0;">Vencimiento: ${vencimiento}</div>
                <div style="margin-top:10px; display:flex; gap:8px;">
                    <button class="btn-pago" data-id="${debt.id}" data-type="debt" style="background:#3182CE; color:#fff; border:none; border-radius:6px; padding:6px 14px; font-size:14px; font-weight:600; cursor:pointer;">Registrar Pago</button>
                    <button class="btn-edit" data-id="${debt.id}" data-type="debt" style="background:#EDF2F7; color:#2B6CB0; border:none; border-radius:6px; padding:6px 14px; font-size:14px; font-weight:600; cursor:pointer;">Editar</button>
                    <button class="btn-delete" data-id="${debt.id}" data-type="debt" style="background:#E53E3E; color:#fff; border:none; border-radius:6px; padding:6px 14px; font-size:14px; font-weight:600; cursor:pointer;">Eliminar</button>
                </div>
            `;
            list.appendChild(item);
        });
        // Listeners para editar/eliminar/pago
        list.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => this.openEditModal(e, 'debt'));
        });
        list.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteItem(e, 'debt'));
        });
        list.querySelectorAll('.btn-pago').forEach(btn => {
            btn.addEventListener('click', (e) => this.openPagoModal(e, 'debt'));
        });
    }

    renderCredits(credits) {
        const list = document.getElementById('credit-list');
        if (!list) return;
        list.innerHTML = '';
        if (!credits.length) {
            list.innerHTML = '<div class="empty">No hay cobros registrados.</div>';
            return;
        }
        credits.forEach(credit => {
            const devuelto = credit.returned || 0;
            const porCobrar = Math.max(0, (credit.amount || 0) - devuelto);
            const porcentaje = credit.amount ? Math.min(100, Math.round((devuelto / credit.amount) * 100)) : 0;
            const fecha = credit.date ? new Date(credit.date).toLocaleDateString() : '';
            const item = document.createElement('div');
            item.className = 'credito-card';
            item.style = 'background:#F7FAFC; border-radius:8px; padding:20px; margin-bottom:18px; box-shadow:0 1px 2px rgba(0,0,0,0.03);';
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:18px; font-weight:700; color:#2D3748;">${credit.name}</div>
                    <span style="background:#ECC94B; color:#fff; font-size:13px; border-radius:6px; padding:2px 10px; font-weight:600;">${porCobrar > 0 ? 'Pendiente' : 'Cobrado'}</span>
                </div>
                <div style="font-size:15px; color:#4A5568; margin-top:4px;">Monto prestado: <b>$${(credit.amount||0).toFixed(2)}</b></div>
                <div style="font-size:15px; color:#4A5568;">Devuelto: <b>$${devuelto.toFixed(2)}</b> (${porcentaje}%)</div>
                <div style="margin:10px 0 6px 0; background:#E2E8F0; border-radius:6px; height:12px; width:100%;">
                    <div style="background:#38A169; width:${porcentaje}%; height:100%; border-radius:6px;"></div>
                </div>
                <div style="font-size:14px; color:#ECC94B;">Por cobrar: $${porCobrar.toFixed(2)}</div>
                <div style="font-size:13px; color:#A0AEC0;">Fecha préstamo: ${fecha}</div>
                <div style="margin-top:10px; display:flex; gap:8px;">
                    <button class="btn-cobro" data-id="${credit.id}" data-type="credit" style="background:#3182CE; color:#fff; border:none; border-radius:6px; padding:6px 14px; font-size:14px; font-weight:600; cursor:pointer;">Registrar Cobro</button>
                    <button class="btn-edit" data-id="${credit.id}" data-type="credit" style="background:#EDF2F7; color:#2B6CB0; border:none; border-radius:6px; padding:6px 14px; font-size:14px; font-weight:600; cursor:pointer;">Editar</button>
                    <button class="btn-delete" data-id="${credit.id}" data-type="credit" style="background:#E53E3E; color:#fff; border:none; border-radius:6px; padding:6px 14px; font-size:14px; font-weight:600; cursor:pointer;">Eliminar</button>
                </div>
            `;
            list.appendChild(item);
        });
        // Listeners para editar/eliminar/cobro
        list.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => this.openEditModal(e, 'credit'));
        });
        list.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteItem(e, 'credit'));
        });
        list.querySelectorAll('.btn-cobro').forEach(btn => {
            btn.addEventListener('click', (e) => this.openPagoModal(e, 'credit'));
        });
    }

    renderDebtSummary(debts) {
        const summary = document.getElementById('debt-summary');
        if (!summary) return;
        const total = debts.reduce((sum, d) => sum + (d.amount || 0), 0);
        const pagado = debts.reduce((sum, d) => sum + (d.paid || 0), 0);
        const pendiente = Math.max(0, total - pagado);
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
                    data: [pagado, pendiente],
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
                                return `${context.label}: $${value.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} (${percentage}%)`;
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
                <div style="color:#38A169; font-weight:700; font-size:18px; margin-bottom:6px;">&#9679; Pagado: $${pagado.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                <div style="color:#E53E3E; font-weight:700; font-size:18px;">&#9679; Pendiente: $${pendiente.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
            </div>
        `;
    }

    renderCreditSummary(credits) {
        const summary = document.getElementById('credit-summary');
        if (!summary) return;
        const total = credits.reduce((sum, c) => sum + (c.amount || 0), 0);
        const devuelto = credits.reduce((sum, c) => sum + (c.returned || 0), 0);
        const porCobrar = Math.max(0, total - devuelto);
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
                    data: [devuelto, porCobrar],
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
                                return `${context.label}: $${value.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} (${percentage}%)`;
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
                <div style="color:#38A169; font-weight:700; font-size:18px; margin-bottom:6px;">&#9679; Cobrado: $${devuelto.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                <div style="color:#ECC94B; font-weight:700; font-size:18px;">&#9679; Por cobrar: $${porCobrar.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
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
        if (id && mode === 'pago') {
            // Registrar pago: sumar al pagado anterior
            const debt = this.debts.find(d => d.id === id);
            const nuevoPagado = (debt.paid || 0) + paidInput;
            await this.updateDebt(id, { paid: nuevoPagado });
            // Registrar transacción de gasto
            if (window.transactionsManager) {
                const now = new Date();
                const date = now.toISOString().split('T')[0];
                const time = now.toTimeString().slice(0,5);
                await window.transactionsManager.handleTransactionSubmitDirect({
                    type: 'expense',
                    amount: paidInput,
                    category: 'other_expense',
                    description: `Pago de deuda: ${debt.name}`,
                    date,
                    time
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
        if (id && mode === 'cobro') {
            // Registrar cobro: sumar al devuelto anterior
            const credit = this.credits.find(c => c.id === id);
            const nuevoDevuelto = (credit.returned || 0) + returnedInput;
            await this.updateCredit(id, { returned: nuevoDevuelto });
            // Registrar transacción de ingreso
            if (window.transactionsManager) {
                const now = new Date();
                const dateNow = now.toISOString().split('T')[0];
                const time = now.toTimeString().slice(0,5);
                await window.transactionsManager.handleTransactionSubmitDirect({
                    type: 'income',
                    amount: returnedInput,
                    category: 'other_income',
                    description: `Cobro de préstamo: ${credit.name}`,
                    date: dateNow,
                    time
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
