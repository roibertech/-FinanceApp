// Gestión de la interfaz de usuario
class UIManager {
    // Mapear data-page a los ids reales de las páginas
    getPageIdFromDataPage(dataPage) {
        // Ajusta aquí si los ids de página no coinciden exactamente con data-page
        if (dataPage === 'dashboard') return 'dashboard-page';
        if (dataPage === 'transactions') return 'transactions-page';
        if (dataPage === 'balance') return 'balance-page';
        if (dataPage === 'budget') return 'budget-page';
        if (dataPage === 'goals') return 'goals-page';
        if (dataPage === 'reports') return 'reports-page';
        if (dataPage === 'settings') return 'settings-page';
        return dataPage + '-page';
    }

    // Mostrar una página por id y ocultar las demás
    showPage(pageId) {
        // Ocultar todas las páginas
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
            page.style.display = 'none';
        });
        // Mostrar la página solicitada
        const page = document.getElementById(pageId);
        if (page) {
            page.classList.add('active');
            page.style.display = '';
        }
        // Si hay app principal, asegúrate de mostrarla
        if (this.app) this.app.style.display = '';
    }
    constructor() {
        this.modals = {
            login: document.getElementById('loginModal'),
            register: document.getElementById('registerModal'),
            transaction: document.getElementById('transactionModal'),
            transfer: document.getElementById('transferModal'),
            debt: document.getElementById('debtModal'),
            credit: document.getElementById('creditModal')
        };

        this.forms = {
            login: document.getElementById('loginForm'),
            register: document.getElementById('registerForm'),
            transaction: document.getElementById('transactionForm'),
            transfer: document.getElementById('transferForm'),
            debt: document.getElementById('debtForm'),
            credit: document.getElementById('creditForm')
        };
        
        this.app = document.getElementById('app');
        
        this.initEventListeners();
    }

    initEventListeners() {
        // Navegación sidebar
        document.querySelectorAll('.nav-item[data-page]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                // Quitar clase active de todos
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                // Mostrar la página correspondiente
                const pageId = this.getPageIdFromDataPage(item.getAttribute('data-page'));
                this.showPage(pageId);
            });
        });
    this.initModalCloseListeners();
        // Mostrar modal de agregar deuda
        const addDebtBtns = document.querySelectorAll('button, .btn-primary');
        addDebtBtns.forEach(btn => {
            if (btn.textContent && btn.textContent.includes('Agregar Nueva Deuda')) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showDebtModal();
                });
            }
        });
        // Mostrar modal de agregar cobro
        const addCreditBtns = document.querySelectorAll('button, .btn-primary');
        addCreditBtns.forEach(btn => {
            if (btn.textContent && (btn.textContent.includes('Nuevo Préstamo') || btn.textContent.includes('Agregar Préstamo'))) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showCreditModal();
                });
            }
        });
        // Cerrar modal deuda
        const closeDebt = document.getElementById('closeDebtModal');
        if (closeDebt) closeDebt.addEventListener('click', () => this.hideModal(this.modals.debt));
        // Cerrar modal cobro
        const closeCredit = document.getElementById('closeCreditModal');
        if (closeCredit) closeCredit.addEventListener('click', () => this.hideModal(this.modals.credit));
        // ...resto de listeners...
    }

    showDebtModal(mode = 'add', debt = null) {
        this.hideAllModals();
        const form = this.forms.debt;
        form.reset();
        form.removeAttribute('data-mode');
        form.elements['debtId'].value = '';
        form.elements['debtName'].readOnly = false;
        form.elements['debtAmount'].readOnly = false;
        form.elements['debtDueDate'].readOnly = false;
        form.elements['debtPaid'].readOnly = false;
        form.elements['debtPaid'].placeholder = '';
        // Restaurar required y disabled
        form.elements['debtName'].required = true;
        form.elements['debtAmount'].required = true;
        form.elements['debtDueDate'].required = true;
        form.elements['debtName'].disabled = false;
        form.elements['debtAmount'].disabled = false;
        form.elements['debtDueDate'].disabled = false;
        if (mode === 'add') {
            document.getElementById('debtModalTitle').textContent = 'Agregar Deuda';
            form.elements['debtPaid'].parentElement.style.display = '';
            form.elements['debtName'].parentElement.style.display = '';
            form.elements['debtAmount'].parentElement.style.display = '';
            form.elements['debtDueDate'].parentElement.style.display = '';
        } else if (mode === 'edit' && debt) {
            document.getElementById('debtModalTitle').textContent = 'Editar Deuda';
            form.elements['debtId'].value = debt.id;
            form.elements['debtName'].value = debt.name;
            form.elements['debtAmount'].value = debt.amount;
            form.elements['debtPaid'].value = debt.paid || 0;
            form.elements['debtDueDate'].value = debt.dueDate ? debt.dueDate.split('T')[0] : '';
            form.elements['debtPaid'].parentElement.style.display = '';
            form.elements['debtName'].parentElement.style.display = '';
            form.elements['debtAmount'].parentElement.style.display = '';
            form.elements['debtDueDate'].parentElement.style.display = '';
        } else if (mode === 'pago' && debt) {
            document.getElementById('debtModalTitle').textContent = 'Registrar Pago';
            form.elements['debtId'].value = debt.id;
            form.elements['debtPaid'].value = '';
            form.elements['debtPaid'].placeholder = `Monto a pagar (pendiente: $${((debt.amount||0)-(debt.paid||0)).toFixed(2)})`;
            form.elements['debtPaid'].parentElement.style.display = '';
            // Ocultar campos con disabled y quitar required
            form.elements['debtName'].parentElement.style.display = '';
            form.elements['debtAmount'].parentElement.style.display = '';
            form.elements['debtDueDate'].parentElement.style.display = '';
            form.elements['debtName'].disabled = true;
            form.elements['debtAmount'].disabled = true;
            form.elements['debtDueDate'].disabled = true;
            form.elements['debtName'].required = false;
            form.elements['debtAmount'].required = false;
            form.elements['debtDueDate'].required = false;
            form.elements['debtName'].parentElement.style.display = 'none';
            form.elements['debtAmount'].parentElement.style.display = 'none';
            form.elements['debtDueDate'].parentElement.style.display = 'none';
            form.setAttribute('data-mode', 'pago');
        }
        this.modals.debt.style.display = 'block';
    }

    showCreditModal(mode = 'add', credit = null) {
        this.hideAllModals();
        const form = this.forms.credit;
        form.reset();
        form.removeAttribute('data-mode');
        form.elements['creditId'].value = '';
        form.elements['creditName'].readOnly = false;
        form.elements['creditAmount'].readOnly = false;
        form.elements['creditDate'].readOnly = false;
        form.elements['creditReturned'].readOnly = false;
        form.elements['creditReturned'].placeholder = '';
        // Restaurar required y disabled
        form.elements['creditName'].required = true;
        form.elements['creditAmount'].required = true;
        form.elements['creditDate'].required = true;
        form.elements['creditName'].disabled = false;
        form.elements['creditAmount'].disabled = false;
        form.elements['creditDate'].disabled = false;
        if (mode === 'add') {
            document.getElementById('creditModalTitle').textContent = 'Agregar Préstamo';
            form.elements['creditReturned'].parentElement.style.display = '';
            form.elements['creditName'].parentElement.style.display = '';
            form.elements['creditAmount'].parentElement.style.display = '';
            form.elements['creditDate'].parentElement.style.display = '';
        } else if (mode === 'edit' && credit) {
            document.getElementById('creditModalTitle').textContent = 'Editar Préstamo';
            form.elements['creditId'].value = credit.id;
            form.elements['creditName'].value = credit.name;
            form.elements['creditAmount'].value = credit.amount;
            form.elements['creditReturned'].value = credit.returned || 0;
            form.elements['creditDate'].value = credit.date ? credit.date.split('T')[0] : '';
            form.elements['creditReturned'].parentElement.style.display = '';
            form.elements['creditName'].parentElement.style.display = '';
            form.elements['creditAmount'].parentElement.style.display = '';
            form.elements['creditDate'].parentElement.style.display = '';
        } else if (mode === 'cobro' && credit) {
            document.getElementById('creditModalTitle').textContent = 'Registrar Cobro';
            form.elements['creditId'].value = credit.id;
            form.elements['creditReturned'].value = '';
            form.elements['creditReturned'].placeholder = `Monto a cobrar (por cobrar: $${((credit.amount||0)-(credit.returned||0)).toFixed(2)})`;
            form.elements['creditReturned'].parentElement.style.display = '';
            // Ocultar campos con disabled y quitar required
            form.elements['creditName'].parentElement.style.display = '';
            form.elements['creditAmount'].parentElement.style.display = '';
            form.elements['creditDate'].parentElement.style.display = '';
            form.elements['creditName'].disabled = true;
            form.elements['creditAmount'].disabled = true;
            form.elements['creditDate'].disabled = true;
            form.elements['creditName'].required = false;
            form.elements['creditAmount'].required = false;
            form.elements['creditDate'].required = false;
            form.elements['creditName'].parentElement.style.display = 'none';
            form.elements['creditAmount'].parentElement.style.display = 'none';
            form.elements['creditDate'].parentElement.style.display = 'none';
            form.setAttribute('data-mode', 'cobro');
        }
        this.modals.credit.style.display = 'block';
    }

    // El siguiente bloque estaba fuera de cualquier método, lo movemos aquí:
    // (Debe ir dentro de initEventListeners, después de los otros listeners)
    // --- INICIO BLOQUE MOVIDO ---
    // Cerrar modales al hacer clic fuera
    initModalCloseListeners() {
        Object.values(this.modals).forEach(modal => {
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.hideModal(modal);
                    }
                });
            }
        });
        // Botones de cerrar en modales
        const closeButtons = document.querySelectorAll('.close');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.hideAllModals();
            });
        });
    }

    // Llamar a este método al final de initEventListeners

    // Mostrar modal de login (soporta modal moderno y clásico)
    showLoginModal() {
        this.hideAllModals();
        // Si existe el modal clásico
        if (this.modals.login) {
            this.modals.login.style.display = 'block';
        } else {
            // Si existe el modal moderno
            var authModal = document.getElementById('authModal');
            var loginSection = document.getElementById('loginSection');
            var registerSection = document.getElementById('registerSection');
            if (authModal && loginSection && registerSection) {
                authModal.style.display = 'flex';
                loginSection.style.display = 'block';
                registerSection.style.display = 'none';
            }
        }
    }

    // Mostrar modal de registro (soporta modal moderno y clásico)
    showRegisterModal() {
        this.hideAllModals();
        // Si existe el modal clásico
        if (this.modals.register) {
            this.modals.register.style.display = 'block';
        } else {
            // Si existe el modal moderno
            var authModal = document.getElementById('authModal');
            var loginSection = document.getElementById('loginSection');
            var registerSection = document.getElementById('registerSection');
            if (authModal && loginSection && registerSection) {
                authModal.style.display = 'flex';
                loginSection.style.display = 'none';
                registerSection.style.display = 'block';
            }
        }
    }

    // Mostrar modal de transacción
    showTransactionModal() {
        this.hideAllModals();
        this.modals.transaction.style.display = 'block';
    }

    // ← AÑADIR ESTE MÉTODO (Mostrar modal de transferencia)
    showTransferModal() {
        this.hideAllModals();
        // Actualizar balance disponible
        if (typeof transactionsPage !== 'undefined' && transactionsPage.updateAvailableBalance) {
            transactionsPage.updateAvailableBalance();
        }
        this.modals.transfer.style.display = 'block';
    }

    // Ocultar modal específico
    hideModal(modal) {
        if (modal) modal.style.display = 'none';
    }

    // Ocultar todos los modales de autenticación (soporta modal moderno)
    hideAuthModals() {
        // Soporte para modal clásico
        if (this.modals.login) this.modals.login.style.display = 'none';
        if (this.modals.register) this.modals.register.style.display = 'none';
        // Soporte para modal moderno
        var authModal = document.getElementById('authModal');
        if (authModal) authModal.style.display = 'none';
    }

    // Ocultar modal de registro (soporta modal moderno y clásico)
    hideRegisterModal() {
        if (this.modals.register) {
            this.modals.register.style.display = 'none';
        }
        var authModal = document.getElementById('authModal');
        var registerSection = document.getElementById('registerSection');
        var loginSection = document.getElementById('loginSection');
        if (authModal && registerSection && loginSection) {
            authModal.style.display = 'none';
            registerSection.style.display = 'none';
            loginSection.style.display = 'block';
        }
    }

    // Ocultar todos los modales
    hideAllModals() {
        Object.values(this.modals).forEach(modal => {
            if (modal) modal.style.display = 'none';
        });
    }

    // Mostrar aplicación
    showApp() {
        this.app.style.display = 'flex';
    }

    // Ocultar aplicación
    hideApp() {
        this.app.style.display = 'none';
    }

    // Actualizar perfil de usuario en la interfaz
    updateUserProfile(userData) {
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        const userSubtitle = document.getElementById('userSubtitle');

        if (userName && userData.name) {
            userName.textContent = userData.name;
        }
        
        if (userAvatar && userData.name) {
            userAvatar.textContent = userData.name.charAt(0).toUpperCase();
        }
        
        if (userSubtitle) {
            userSubtitle.textContent = 'Bienvenido de nuevo';
        }
    }

    // Mostrar mensaje de error
    showError(message, elementId = null) {
        // Eliminar errores anteriores
        this.clearErrors();

        // Crear elemento de error
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        errorElement.style.color = '#e53e3e';
        errorElement.style.marginTop = '10px';
        errorElement.style.textAlign = 'center';

        // Insertar después del formulario correspondiente
        if (elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                element.parentNode.insertBefore(errorElement, element.nextSibling);
            }
        } else {
            // Insertar en el modal clásico si existe
            const activeModal = Object.values(this.modals).find(modal => modal && modal.style.display === 'block');
            if (activeModal) {
                const form = activeModal.querySelector('form');
                if (form) {
                    form.appendChild(errorElement);
                    setTimeout(() => {
                        if (errorElement.parentNode) {
                            errorElement.parentNode.removeChild(errorElement);
                        }
                    }, 5000);
                    return;
                }
            }
            // Si no hay modal clásico, buscar el modal moderno
            const authModal = document.getElementById('authModal');
            if (authModal) {
                // Buscar formulario visible
                let form = null;
                const loginSection = document.getElementById('loginSection');
                const registerSection = document.getElementById('registerSection');
                if (registerSection && registerSection.style.display !== 'none') {
                    form = registerSection.querySelector('form');
                } else if (loginSection && loginSection.style.display !== 'none') {
                    form = loginSection.querySelector('form');
                }
                if (form) {
                    form.appendChild(errorElement);
                } else {
                    authModal.appendChild(errorElement);
                }
            }
        }
        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            if (errorElement.parentNode) {
                errorElement.parentNode.removeChild(errorElement);
            }
        }, 5000);
    }

    // Limpiar mensajes de error
    clearErrors() {
        const errors = document.querySelectorAll('.error-message');
        errors.forEach(error => error.remove());
    }

    // Mostrar mensaje de éxito
    showSuccess(message) {
        // Crear elemento de éxito flotante
        const successElement = document.createElement('div');
        successElement.className = 'success-message';
        successElement.textContent = message;
        successElement.style.position = 'fixed';
        successElement.style.top = '24px';
        successElement.style.right = '24px';
        successElement.style.zIndex = '9999';
        successElement.style.color = '#38a169';
        successElement.style.textAlign = 'center';
        successElement.style.padding = '14px 28px';
        successElement.style.backgroundColor = '#f0fff4';
        successElement.style.borderRadius = '8px';
        successElement.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
        successElement.style.fontWeight = '600';
        successElement.style.fontSize = '16px';
        successElement.style.pointerEvents = 'none';

        // Insertar en el cuerpo del documento
        document.body.appendChild(successElement);

        // Auto-eliminar después de 3 segundos
        setTimeout(() => {
            if (successElement.parentNode) {
                successElement.parentNode.removeChild(successElement);
            }
        }, 3000);
    }
}

// Instancia global del administrador de UI
const UI = new UIManager();
window.UI = UI;

// Lógica para alternar entre login y registro en el modal moderno (protección máxima)
document.addEventListener('DOMContentLoaded', function() {
    function setupAuthModalToggle() {
        var authModal = document.getElementById('authModal');
        if (!authModal) return;
        var showRegister = document.getElementById('showRegister');
        var showLogin = document.getElementById('showLogin');
        var loginSection = document.getElementById('loginSection');
        var registerSection = document.getElementById('registerSection');
        if (showRegister && loginSection && registerSection) {
            showRegister.addEventListener('click', function(e) {
                e.preventDefault();
                loginSection.style.display = 'none';
                registerSection.style.display = 'block';
            });
        }
        if (showLogin && loginSection && registerSection) {
            showLogin.addEventListener('click', function(e) {
                e.preventDefault();
                registerSection.style.display = 'none';
                loginSection.style.display = 'block';
            });
        }
    }
    setupAuthModalToggle();
});
