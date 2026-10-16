import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .dev.vars
const envPath = join(__dirname, '..', 'worker', '.dev.vars');
let accountId = '';
let token = '';
let gatewayId = 'lee-todo';

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

console.log('Testing Cloudflare AI Gateway...');
console.log('Account:', accountId);
console.log('Gateway:', gatewayId);
console.log('Token starts with:', token.slice(0, 10));

async function testAll() {
  // Test direct Workers AI endpoint
  const directUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`;
  console.log('\n--- Test 1: Direct Workers AI with gateway header ---', directUrl);
  try {
    const r = await fetch(directUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'cf-aig-gateway-id': gatewayId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Say hello in 3 words' }]
      })
    });
    console.log('Direct status:', r.status);
    console.log('Direct body:', await r.text());
  } catch (e) {
    console.error('Direct error:', e);
  }

  // Test AI Gateway workers-ai endpoint
  const gwUrl = `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/workers-ai/@cf/meta/llama-3.1-8b-instruct`;
  console.log('\n--- Test 2: AI Gateway Workers AI ---', gwUrl);
  try {
    const r = await fetch(gwUrl, {
      method: 'POST',
      headers: {
        'cf-aig-authorization': `Bearer ${token}`,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Say hello in 3 words' }]
      })
    });
    console.log('Gateway status:', r.status);
    console.log('Gateway body:', await r.text());
  } catch (e) {
    console.error('Gateway error:', e);
  }
}

testAll();

