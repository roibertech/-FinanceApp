// migrate-convertedUSD.js
// Script para migrar movimientos históricos de gastos en VES y agregar el campo convertedUSD usando la tasa actual

(async function migrateConvertedUSD() {
    // Configuración: tasa actual USD/VES
    let rate = 1;
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        rate = data.rates.VES || 1;
        console.log('[MIGRACIÓN] Tasa actual USD/VES:', rate);
    } catch (e) {
        console.error('[MIGRACIÓN] Error obteniendo tasa actual:', e);
        rate = 1;
    }
    // Obtener todas las transacciones del usuario
    const user = authManager.getCurrentUser();
    if (!user) {
        alert('Debes iniciar sesión para ejecutar la migración.');
        return;
    }
    const snapshot = await dbManager.db.collection('transactions').where('userId', '==', user.uid).get();
    let updatedCount = 0;
    snapshot.forEach(async doc => {
        const tx = doc.data();
        // Solo gastos en VES sin convertedUSD
        if (tx.type === 'expense' && tx.currency === 'VES' && !tx.convertedUSD) {
            const convertedUSD = rate > 0 ? tx.amount / rate : null;
            await dbManager.db.collection('transactions').doc(doc.id).update({
                convertedUSD,
                usedRate: rate
            });
            updatedCount++;
            console.log(`[MIGRACIÓN] Actualizado: ${doc.id} | VES ${tx.amount} → USD ${convertedUSD}`);
        }
    });
    setTimeout(() => {
        alert(`[MIGRACIÓN] Proceso finalizado. Movimientos actualizados: ${updatedCount}`);
    }, 3000);
})();
