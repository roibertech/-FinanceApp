// currency.js - Módulo para gestión de monedas y tasas de cambio
// Usa exchangerate-api.com

const EXCHANGE_API_KEY = '826e13716e2009fc4746b47c';
const EXCHANGE_API_URL = `https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/`;

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'VES'];

class CurrencyManager {
    constructor() {
        this.rates = { USD: 1, EUR: 1, VES: 1 };
        this.base = 'USD';
        this.lastUpdate = null;
    }

    async fetchRates(base = 'USD') {
        if (!SUPPORTED_CURRENCIES.includes(base)) base = 'USD';
        const url = EXCHANGE_API_URL + base;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data && data.conversion_rates) {
                this.rates = data.conversion_rates;
                this.base = base;
                this.lastUpdate = new Date();
                return true;
            }
        } catch (e) {
            console.error('Error obteniendo tasas de cambio:', e);
        }
        return false;
    }

    // Convierte un monto de una moneda a otra usando las tasas actuales
    convert(amount, from, to) {
        if (from === to) return amount;
        if (!this.rates[from] || !this.rates[to]) return amount;
        // Primero a base USD, luego a destino
        const usdAmount = amount / this.rates[from];
        return usdAmount * this.rates[to];
    }
}

// Instancia global
const currencyManager = new CurrencyManager();
window.currencyManager = currencyManager;
