// ═══════════════════════════════════════════════════════════════
// Push Notification Routes — Web Push API (VAPID)
// Works with Service Workers on all platforms
// ═══════════════════════════════════════════════════════════════
import { Hono } from 'hono';

export const pushRouter = new Hono();

// ── GET /api/push/vapid-key — Return public VAPID key ──
pushRouter.get('/vapid-key', async (c) => {
  const vapidPublicKey = c.env.VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    return c.json({ error: 'VAPID keys not configured' }, 500);
  }
  return c.json({ publicKey: vapidPublicKey });
});

// ── POST /api/push/subscribe — Save push subscription ──
pushRouter.post('/subscribe', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const { subscription, deviceName } = body;
  
  if (!subscription || !subscription.endpoint) {
    return c.json({ error: 'Invalid subscription' }, 400);
  }
  
  const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const keys = subscription.keys || {};
  
  try {
    // Upsert subscription (replace if endpoint exists)
    await db.prepare(
      `INSERT OR REPLACE INTO push_subscriptions (id, endpoint, key_p256dh, key_auth, device_name, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).bind(id, subscription.endpoint, keys.p256dh || '', keys.auth || '', deviceName || 'Unknown Device').run();
    
    return c.json({ success: true, id });
  } catch (err) {
    return c.json({ error: 'Failed to save subscription', detail: err.message }, 500);
  }
});

// ── DELETE /api/push/unsubscribe — Remove push subscription ──
pushRouter.delete('/unsubscribe', async (c) => {
  const db = c.env.DB;
  const { endpoint } = await c.req.json();
  
  if (!endpoint) return c.json({ error: 'Endpoint is required' }, 400);
  
  try {
    await db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).run();
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: 'Failed to unsubscribe', detail: err.message }, 500);
  }
});

// ── GET /api/push/subscriptions — List all subscriptions ──
pushRouter.get('/subscriptions', async (c) => {
  const db = c.env.DB;
  
  try {
    const { results } = await db.prepare(
      'SELECT id, device_name, created_at FROM push_subscriptions'
    ).all();
    return c.json({ subscriptions: results });
  } catch (err) {
    return c.json({ error: 'Failed to fetch subscriptions', detail: err.message }, 500);
  }
});

// ── POST /api/push/test — Send a test notification ──
pushRouter.post('/test', async (c) => {
  const db = c.env.DB;
  const env = c.env;
  
  try {
    const { results: subs } = await db.prepare('SELECT * FROM push_subscriptions').all();
    
    if (subs.length === 0) {
      return c.json({ error: 'No subscriptions found. Enable notifications first.' }, 404);
    }
    
    const payload = JSON.stringify({
      title: '🔔 Lee To-Do',
      body: 'Notifications are working! You\'ll get task reminders here.',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: 'test-notification',
      data: { url: '/' }
    });
    
    let sent = 0;
    let failed = 0;
    
    for (const sub of subs) {
      try {
        await sendWebPush(env, {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.key_p256dh, auth: sub.key_auth }
        }, payload);
        sent++;
      } catch (err) {
        console.error('Push failed for', sub.device_name, err.message);
        // Remove invalid subscriptions
        if (err.status === 410 || err.status === 404) {
          await db.prepare('DELETE FROM push_subscriptions WHERE id = ?').bind(sub.id).run();
        }
        failed++;
      }
    }
    
    return c.json({ success: true, sent, failed });
  } catch (err) {
    return c.json({ error: 'Failed to send test notification', detail: err.message }, 500);
  }
});

// ── POST /api/push/cron-trigger — Manually dispatch scheduled daily/weekly notifications ──
pushRouter.post('/cron-trigger', async (c) => {
  try {
    const { handleCronNotifications } = await import('../cron/notifier.js');
    const result = await handleCronNotifications(c.env, { force: true });
    return c.json(result);
  } catch (err) {
    return c.json({ error: 'Failed to dispatch cron notifications', detail: err.message }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════
// Web Push implementation using Web Crypto API (Workers-compatible)
// Implements RFC 8291 (Web Push) + RFC 8292 (VAPID)
// ═══════════════════════════════════════════════════════════════

export async function sendWebPush(env, subscription, payload) {
  const vapidSubject = env.VAPID_SUBJECT || 'mailto:admin@leetodo.app';
  const vapidPublicKey = env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = env.VAPID_PRIVATE_KEY;
  
  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error('VAPID keys not configured');
  }
  
  // Create VAPID JWT
  const audience = new URL(subscription.endpoint).origin;
  const jwt = await createVapidJwt(audience, vapidSubject, vapidPrivateKey);
  
  // Encrypt payload
  const encrypted = await encryptPayload(subscription, payload);
  
  // Send push
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt},k=${vapidPublicKey}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': '86400',
      'Urgency': 'high',
    },
    body: encrypted,
  });
  
  if (!response.ok) {
    const error = new Error(`Push failed: ${response.status} ${response.statusText}`);
    error.status = response.status;
    throw error;
  }
  
  return response;
}

// ── Create VAPID JWT for authorization ──
async function createVapidJwt(audience, subject, privateKeyBase64url) {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    aud: audience,
    exp: now + 86400,
    sub: subject,
  };
  
  const headerB64 = base64urlEncode(JSON.stringify(header));
  const claimsB64 = base64urlEncode(JSON.stringify(claims));
  const unsignedToken = `${headerB64}.${claimsB64}`;
  
  // Import private key
  const keyData = base64urlDecode(privateKeyBase64url);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  
  // Sign
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsignedToken)
  );
  
  // Convert DER signature to raw format
  const sigArray = new Uint8Array(signature);
  const rawSig = derToRaw(sigArray);
  
  return `${unsignedToken}.${arrayToBase64url(rawSig)}`;
}

// ── Encrypt push payload (simplified aes128gcm) ──
async function encryptPayload(subscription, payload) {
  const payloadBytes = new TextEncoder().encode(payload);
  
  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  
  // Import subscriber's public key
  const subPubKeyBytes = base64urlDecode(subscription.keys.p256dh);
  const subPubKey = await crypto.subtle.importKey(
    'raw',
    subPubKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  
  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subPubKey },
    localKeyPair.privateKey,
    256
  );
  
  // Export local public key
  const localPubKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPubKeyBytes = new Uint8Array(localPubKeyRaw);
  
  // Auth secret
  const authSecret = base64urlDecode(subscription.keys.auth);
  
  // Derive encryption key and nonce using HKDF
  const ikm = await hkdf(
    new Uint8Array(sharedSecret),
    authSecret,
    combineInfo('WebPush: info\0', subPubKeyBytes, localPubKeyBytes),
    32
  );
  
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const keyBytes = await hkdf(ikm, salt, createInfo('Content-Encoding: aes128gcm\0'), 16);
  const nonceBytes = await hkdf(ikm, salt, createInfo('Content-Encoding: nonce\0'), 12);
  
  // Encrypt with AES-128-GCM
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  
  // Add padding
  const paddedPayload = new Uint8Array(payloadBytes.length + 2);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // delimiter
  paddedPayload[payloadBytes.length + 1] = 0; // padding
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonceBytes, tagLength: 128 },
    key,
    paddedPayload
  );
  
  // Build aes128gcm header
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, paddedPayload.length + 16 + 1); // +16 tag +1
  
  const header = new Uint8Array(
    salt.length + 4 + 1 + localPubKeyBytes.length
  );
  let offset = 0;
  header.set(salt, offset); offset += salt.length;
  header.set(recordSize, offset); offset += 4;
  header[offset] = localPubKeyBytes.length; offset += 1;
  header.set(localPubKeyBytes, offset);
  
  // Combine header + encrypted data
  const result = new Uint8Array(header.length + encrypted.byteLength);
  result.set(header);
  result.set(new Uint8Array(encrypted), header.length);
  
  return result.buffer;
}

// ── Crypto helpers ──
function combineInfo(prefix, clientPubKey, serverPubKey) {
  const prefixBytes = new TextEncoder().encode(prefix);
  const info = new Uint8Array(prefixBytes.length + clientPubKey.length + serverPubKey.length);
  info.set(prefixBytes);
  info.set(new Uint8Array(clientPubKey), prefixBytes.length);
  info.set(new Uint8Array(serverPubKey), prefixBytes.length + clientPubKey.length);
  return info;
}

function createInfo(encoding) {
  return new TextEncoder().encode(encoding);
}

async function hkdf(ikm, salt, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', key, salt));
  
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const infoWithCounter = new Uint8Array(info.length + 1);
  infoWithCounter.set(info);
  infoWithCounter[info.length] = 1;
  
  const output = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, infoWithCounter));
  return output.slice(0, length);
}

function derToRaw(der) {
  // Simple DER to raw ECDSA signature conversion
  if (der.length === 64) return der;
  
  let offset = 2;
  const rLen = der[offset + 1];
  const r = der.slice(offset + 2, offset + 2 + rLen);
  offset = offset + 2 + rLen;
  const sLen = der[offset + 1];
  const s = der.slice(offset + 2, offset + 2 + sLen);
  
  const raw = new Uint8Array(64);
  raw.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
  raw.set(s.length > 32 ? s.slice(s.length - 32) : s, 64 - Math.min(s.length, 32));
  return raw;
}

function base64urlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str) {
  const padded = str + '='.repeat((4 - str.length % 4) % 4);
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}

function arrayToBase64url(arr) {
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
