import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .dev.vars
const envPath = join(__dirname, '..', 'worker', '.dev.vars');
let accountId = '';
let token = '';
let gatewayId = '';

if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [k, ...v] = trimmed.split('=');
    const val = v.join('=').trim();
    if (k.trim() === 'CF_ACCOUNT_ID') accountId = val;
    if (k.trim() === 'CF_API_TOKEN') token = val;
    if (k.trim() === 'CF_AI_GATEWAY') gatewayId = val;
  }
}

console.log('Account ID:', accountId ? accountId.slice(0, 8) + '...' : 'NONE');
console.log('Token:', token ? token.slice(0, 10) + '...' : 'NONE');
console.log('Gateway ID:', gatewayId || '(none specified)');

const model = '@cf/meta/llama-3.1-8b-instruct';

async function run() {
  // Test 0: Verify Token
  console.log('\n--- Test 0: Verify Token ---');
  try {
    const r = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Verify status:', r.status);
    const data = await r.json();
    console.log('Verify response:', JSON.stringify(data));
  } catch (e) {
    console.error('Verify failed:', e.message);
  }

  // Test 0.5: Accounts accessible by Token
  console.log('\n--- Test 0.5: Accounts accessible by Token ---');
  try {
    const r = await fetch('https://api.cloudflare.com/client/v4/accounts', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Accounts status:', r.status);
    const data = await r.json();
    console.log('Accounts response:', JSON.stringify(data));
  } catch (e) {
    console.error('Accounts failed:', e.message);
  }

  // Test 1: Direct Workers AI REST endpoint
  console.log('\n--- Test 1: Direct Workers AI REST API ---');
  const directUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
  try {
    const r = await fetch(directUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Say hello in 5 words' }]
      })
    });
    console.log('Direct status:', r.status);
    const text = await r.text();
    console.log('Direct response:', text.slice(0, 300));
  } catch (e) {
    console.error('Direct failed:', e.message);
  }

  // Test 2: AI Gateway tests
  console.log('\n--- Test 2: AI Gateway tests ---');
  const gateways = [gatewayId, 'lee-todo', 'lee-todo-gateway', 'default', 'ai-gateway'].filter(Boolean);
  for (const gw of gateways) {
    const gwUrl = `https://gateway.ai.cloudflare.com/v1/${accountId}/${gw}/workers-ai/${model}`;
    try {
      const r = await fetch(gwUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Say hello in 5 words' }]
        })
      });
      console.log(`Gateway [${gw}] status:`, r.status);
      const text = await r.text();
      console.log(`Gateway [${gw}] response:`, text.slice(0, 200));
    } catch (e) {
      console.error(`Gateway [${gw}] error:`, e.message);
    }
  }
}

run();
