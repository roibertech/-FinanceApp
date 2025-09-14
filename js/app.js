// --- Cambio de moneda global ---
document.addEventListener('DOMContentLoaded', function() {
    const currencySelect = document.getElementById('currencySelect');
    if (currencySelect && window.currencyManager) {
        // Cargar preferencia guardada
        const savedCurrency = localStorage.getItem('selectedCurrency') || 'USD';
        currencySelect.value = savedCurrency;
        // Al iniciar, obtener tasas y actualizar UI
        window.currencyManager.fetchRates(savedCurrency).then(() => {
            actualizarMontosGlobal(savedCurrency);
        });
        // Listener de cambio
        currencySelect.addEventListener('change', async function() {
            const newCurrency = currencySelect.value;
            localStorage.setItem('selectedCurrency', newCurrency);
            await window.currencyManager.fetchRates(newCurrency);
            actualizarMontosGlobal(newCurrency);
            // Forzar recarga de deudas y créditos para actualizar símbolos y resumen
            if (window.debtCreditManager && typeof debtCreditManager.loadAndRender === 'function') {
                debtCreditManager.loadAndRender();
            }
            // Forzar renderizado del resumen de préstamos y deudas en dashboard
            if (window.dashboardManager && typeof dashboardManager.updateLoansDebtsSummary === 'function') {
                dashboardManager.updateLoansDebtsSummary();
            }
        });
    }
});

// Función para actualizar todos los montos de la UI principal
function actualizarMontosGlobal(moneda) {
    // Cambiar símbolo y nombre en el selector
    const flag = document.getElementById('currencyFlag');
    if (flag) {
        flag.textContent = moneda === 'USD' ? '$' : (moneda === 'EUR' ? '€' : 'Bs');
    }
    // Actualizar tarjetas principales
    if (window.dashboardManager && dashboardManager.stats) {
        const base = dashboardManager.stats.baseCurrency || 'USD';
        const cm = window.currencyManager;
        // Convertir y mostrar
        const ids = [
            {id: 'totalBalance', val: dashboardManager.stats.totalBalance},
            {id: 'monthlyExpenses', val: dashboardManager.stats.monthlyExpenses},
            {id: 'monthlyIncome', val: dashboardManager.stats.monthlyIncome},
            {id: 'totalSavings', val: dashboardManager.stats.totalSavings}
        ];
        ids.forEach(({id, val}) => {
            const el = document.getElementById(id);
            if (el) {
                const conv = cm.convert(val, base, moneda);
                el.textContent = (moneda === 'VES' ? 'Bs ' : (moneda === 'EUR' ? '€' : '$')) + conv.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
            }
        });
    }
    // Actualizar resumen de préstamos y deudas
    if (window.dashboardManager && typeof dashboardManager.updateLoansDebtsSummary === 'function') {
        dashboardManager.updateLoansDebtsSummary();
    }
    // Actualizar transacciones recientes (si es necesario)
    // Refrescar transacciones recientes usando los datos actuales del dashboard
    if (window.dashboardManager && typeof dashboardManager.updateDashboard === 'function') {
        dashboardManager.updateDashboard();
    }
    // Actualizar otras páginas si es necesario (puedes expandir aquí)
}
// Aplicación principal
class FinanceApp {
    constructor() {
        this.initialized = false;
    }

    // Inicializar la aplicación
    async init() {
        if (this.initialized) return;
        
        // Establecer usuario actual en dbManager
        const user = authManager.getCurrentUser();
        dbManager.setCurrentUser(user);
        
        // Inicializar módulos
        dashboardManager.init();
        transactionsManager.init();
        transactionsPage.init();
        
        // Inicializar gráficos
        chartsManager.initCharts();
        
        this.initialized = true;
        console.log('Aplicación inicializada');
    }

    // Reiniciar la aplicación (para logout)
    reset() {
        this.initialized = false;
        
        // Limpiar listeners
        dashboardManager.cleanup();
        
        // Limpiar datos
        dbManager.setCurrentUser(null);
        
        // Limpiar UI
        document.getElementById('totalBalance').textContent = '$0.00';
        document.getElementById('monthlyExpenses').textContent = '$0.00';
        document.getElementById('monthlyIncome').textContent = '$0.00';
        document.getElementById('totalSavings').textContent = '$0.00';
        document.getElementById('transactionsList').innerHTML = '';
        
        // Limpiar gráficos de Chart.js de forma segura
        // Aseguramos que window.dailySpendingChart y window.categoryExpensesChart apunten a los del chartsManager
        if (typeof chartsManager !== 'undefined') {
            if (chartsManager.dailySpendingChart) {
                window.dailySpendingChart = chartsManager.dailySpendingChart;
            }
            if (chartsManager.categoryExpensesChart) {
                window.categoryExpensesChart = chartsManager.categoryExpensesChart;
            }
        }
        if (window.dailySpendingChart && typeof window.dailySpendingChart.destroy === 'function') {
            window.dailySpendingChart.destroy();
            window.dailySpendingChart = null;
            if (typeof chartsManager !== 'undefined') chartsManager.dailySpendingChart = null;
        }
        if (window.categoryExpensesChart && typeof window.categoryExpensesChart.destroy === 'function') {
            window.categoryExpensesChart.destroy();
            window.categoryExpensesChart = null;
            if (typeof chartsManager !== 'undefined') chartsManager.categoryExpensesChart = null;
        }
    }
}

// Instancia global de la aplicación
const App = new FinanceApp();

// Inicializar Firebase y autenticación cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    // Mostrar loader y ocultar login/app al iniciar
    const loader = document.getElementById('loader');
    const app = document.getElementById('app');
    const authModal = document.getElementById('authModal');
    if (loader) loader.style.display = 'flex';
    if (app) app.style.display = 'none';
    if (authModal) authModal.style.display = 'none';

    // Inicializar listener de autenticación
    authManager.initAuthStateListener();

    // Configurar event listeners para formularios
    UI.forms.login.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleLogin();
    });

    UI.forms.register.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleRegister();
    });

    // Event listener para '¿Olvidaste tu contraseña?'
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            if (!email) {
                UI.showError('Por favor ingresa tu correo electrónico para recuperar tu contraseña.');
                return;
            }
            const result = await authManager.sendPasswordReset(email);
            if (result.success) {
                UI.showError('Se ha enviado un correo para restablecer tu contraseña.');
            } else {
                UI.showError('Error al enviar el correo de recuperación: ' + result.error);
            }
        });
    }
});

// Manejar inicio de sesión
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    const result = await authManager.loginUser(email, password);
    
    if (result.success) {
        UI.clearErrors();
        // El cambio de estado de autenticación se manejará en el listener
    } else {
        UI.showError(result.error);
    }
}

// Manejar registro
async function handleRegister() {
    const firstNameInput = document.getElementById('registerFirstName');
    const lastNameInput = document.getElementById('registerLastName');
    const phoneInput = document.getElementById('registerPhone');
    const emailInput = document.getElementById('registerEmail');
    const passwordInput = document.getElementById('registerPassword');

    if (!firstNameInput || !lastNameInput || !phoneInput || !emailInput || !passwordInput) {
        UI.showError('Faltan campos en el formulario.');
        return;
    }

    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!password) {
        UI.showError('La contraseña no puede estar vacía.');
        return;
    }

    const extraData = {
        name: firstName + ' ' + lastName,
        firstName,
        lastName,
        phone,
        email
    };
    const result = await authManager.registerUser(email, password, extraData);

    if (result.success) {
        UI.clearErrors();
        await dbManager.initializeUserFinances(result.user.uid);
    } else {
        let msg = result.error;
        if (msg && typeof msg === 'string' && msg.includes('email-already')) {
            msg = 'El correo ya está registrado. Intenta iniciar sesión o usa otro correo.';
        }
        UI.showError(msg);
    }
}