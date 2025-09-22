// fix-currency-migration.js
// Script para corregir automáticamente el campo currency en las transacciones de un usuario


async function fixCurrencyForUser(userId) {
    const db = firebase.firestore();
    const transactions = await db.collection('transactions').where('userId', '==', userId).get();
    let updated = 0;
    for (const doc of transactions.docs) {
        await db.collection('transactions').doc(doc.id).update({ currency: 'USD' });
        updated++;
        console.log(`[FIX] Actualizado: ${doc.id} | currency: USD`);
    }
    alert(`[FIX] Proceso finalizado. Todas las transacciones ahora tienen currency: USD. Total actualizadas: ${updated}`);
}

// Ejecutar para el usuario antiguo
fixCurrencyForUser('wR3BsNfE05Of0d220Xz7Ah1d9U82');
