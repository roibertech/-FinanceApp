// validate-migration.js
// Script para validar datos migrados de un usuario en Firestore

async function validateUserMigration(userId) {
    const db = firebase.firestore();
    const transactions = await db.collection('transactions').where('userId', '==', userId).get();
    let missingCurrency = 0;
    let missingType = 0;
    let missingConvertedUSD = 0;
    let total = 0;
    let migrated = 0;
    transactions.forEach(doc => {
        const tx = doc.data();
        total++;
        if (!tx.currency) missingCurrency++;
        if (!tx.type) missingType++;
        if (tx.type === 'expense' && tx.currency === 'VES') {
            if (!('convertedUSD' in tx)) missingConvertedUSD++;
            else migrated++;
        }
    });
    const financesDoc = await db.collection('finances').doc(userId).get();
    const migrationDone = financesDoc.exists && financesDoc.data().convertedMigrationDone === true;
    console.log(`Validación para usuario ${userId}`);
    console.log(`Total transacciones: ${total}`);
    console.log(`Sin currency: ${missingCurrency}`);
    console.log(`Sin type: ${missingType}`);
    console.log(`Gastos VES sin convertedUSD: ${missingConvertedUSD}`);
    console.log(`Gastos VES migrados: ${migrated}`);
    console.log(`Migración marcada como realizada: ${migrationDone}`);
    if (missingCurrency === 0 && missingType === 0 && missingConvertedUSD === 0 && migrationDone) {
        alert('¡Migración exitosa y datos completos!');
    } else {
        alert('Faltan datos o migración incompleta. Revisa la consola para detalles.');
    }
}

// Ejecutar para el usuario antiguo
validateUserMigration('wR3BsNfE05Of0d220Xz7Ah1d9U82');
