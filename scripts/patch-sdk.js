const fs = require('fs');
const path = 'node_modules/@arcasdk/core/lib/infrastructure/outbound/adapters/soap/soap-client.js';

try {
    let content = fs.readFileSync(path, 'utf8');

    // Normalize newlines and indentation just in case, but keep it simple first
    // Use a smaller search chunk if full block fails
    const search = `minDHSize: constants_1.MIN_DH_SIZE_LEGACY,`;
    const replace = `minDHSize: constants_1.MIN_DH_SIZE_LEGACY,
                        ciphers: 'DEFAULT:@SECLEVEL=0',`;

    if (content.includes(search) && !content.includes('ciphers:')) {
        content = content.replace(search, replace);
        fs.writeFileSync(path, content, 'utf8');
        console.log('✅ Patched soap-client.js successfully');
    } else {
        if (content.includes('ciphers:')) {
            console.log('ℹ️ Already patched.');
        } else {
            console.error('❌ Could not find target string to patch in soap-client.js');
            console.log('Content dump:', content.substring(content.indexOf('new https.Agent'), content.indexOf('new https.Agent') + 200));
        }
    }
} catch (e) {
    console.error('❌ Error patching:', e);
}
