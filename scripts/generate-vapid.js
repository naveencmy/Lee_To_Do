// Generate VAPID keys for Web Push notifications
// Run: node scripts/generate-vapid.js

import { webcrypto } from 'crypto';

async function generateVapidKeys() {
  const keyPair = await webcrypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  const publicKeyRaw = await webcrypto.subtle.exportKey('raw', keyPair.publicKey);
  const privateKeyPkcs8 = await webcrypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  const publicKeyBase64url = Buffer.from(publicKeyRaw).toString('base64url');
  const privateKeyBase64url = Buffer.from(privateKeyPkcs8).toString('base64url');

  console.log('\n═══════════════════════════════════════════════');
  console.log('  VAPID Keys Generated Successfully!');
  console.log('═══════════════════════════════════════════════\n');
  console.log('Run these commands to set them as secrets:\n');
  console.log(`cd worker`);
  console.log(`npx wrangler secret put VAPID_PUBLIC_KEY`);
  console.log(`  → Paste: ${publicKeyBase64url}\n`);
  console.log(`npx wrangler secret put VAPID_PRIVATE_KEY`);
  console.log(`  → Paste: ${privateKeyBase64url}\n`);
  console.log(`npx wrangler secret put VAPID_SUBJECT`);
  console.log(`  → Paste: mailto:your-email@example.com\n`);
  console.log('───────────────────────────────────────────────');
  console.log('Also add VAPID_PUBLIC_KEY to your frontend .env:');
  console.log(`VITE_VAPID_PUBLIC_KEY=${publicKeyBase64url}`);
  console.log('───────────────────────────────────────────────\n');
}

generateVapidKeys().catch(console.error);
