const baileys = require("@whiskeysockets/baileys");
console.log('Keys:', Object.keys(baileys));
console.log('makeInMemoryStore type:', typeof baileys.makeInMemoryStore);
console.log('default keys:', baileys.default ? Object.keys(baileys.default) : 'no default');
try {
    const { makeInMemoryStore } = require("@whiskeysockets/baileys");
    console.log('Destructured type:', typeof makeInMemoryStore);
} catch (e) {
    console.log('Destructure error:', e.message);
}
