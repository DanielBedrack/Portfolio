import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readText = async (relativePath) => {
  try {
    return await readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return '';
    throw error;
  }
};

test('pins the approved n8n version', async () => {
  const compose = await readText('compose.yaml');
  assert.match(compose, /image:\s*docker\.n8n\.io\/n8nio\/n8n:2\.43\.7\b/);
});

test('prunes execution data after 24 hours', async () => {
  const compose = await readText('compose.yaml');
  assert.match(compose, /GENERIC_TIMEZONE:\s*Asia\/Jerusalem\b/);
  assert.match(compose, /EXECUTIONS_DATA_PRUNE:\s*["']?true["']?\b/);
  assert.match(compose, /EXECUTIONS_DATA_MAX_AGE:\s*["']?24["']?\b/);
});

test('persists n8n state', async () => {
  const compose = await readText('compose.yaml');
  assert.match(compose, /n8n_data:\s*\/home\/node\/\.n8n\b/);
  assert.match(compose, /^volumes:\s*$[\s\S]*^\s{2}n8n_data:\s*$/m);
});

test('mounts workflows and knowledge read only', async () => {
  const compose = await readText('compose.yaml');
  assert.match(compose, /\.\/workflows:\/workspace\/workflows:ro\b/);
  assert.match(compose, /\.\/knowledge:\/workspace\/knowledge:ro\b/);
});

test('uses placeholder-only secret fields', async () => {
  const [compose, envExample] = await Promise.all([
    readText('compose.yaml'),
    readText('.env.example'),
  ]);
  assert.match(envExample, /^NGROK_AUTHTOKEN=replace_with_local_token$/m);
  assert.match(envExample, /^NGROK_DOMAIN=replace_with_free_static_domain$/m);
  assert.doesNotMatch(`${compose}\n${envExample}`, /\b2[a-z0-9_-]{24,}\b/iu);
});

test('keeps the former real-estate client name out of public chatbot knowledge', async () => {
  const [knowledge, ragKnowledge, workflow] = await Promise.all([
    readText('knowledge/portfolio-approved.json'),
    readText('knowledge/rag/portfolio-approved.md'),
    readText('workflows/portfolio-chat.json'),
  ]);

  assert.doesNotMatch(`${knowledge}\n${ragKnowledge}\n${workflow}`, /Megureit/);
  assert.match(knowledge, /Real-Estate Company/);
  assert.match(workflow, /REAL-ESTATE COMPANY/);
});

test('enables the hybrid assistant in the GitHub Pages production build', async () => {
  const workflow = await readText('../.github/workflows/deploy-pages.yml');

  assert.match(
    workflow,
    /- name: Build hybrid portfolio[\s\S]*?env:[\s\S]*?VITE_PORTFOLIO_CHAT_ENABLED:\s*["']?true["']?[\s\S]*?run:\s*npm run build/,
  );
  assert.match(
    workflow,
    /VITE_PORTFOLIO_CHAT_GATEWAY_URL:\s*\$\{\{\s*vars\.PORTFOLIO_CHAT_GATEWAY_URL\s*\}\}/,
  );
});

test('isolates n8n and the gateway while exposing only the gateway through ngrok', async () => {
  const compose = await readText('compose.yaml');
  assert.match(compose, /127\.0\.0\.1:\$\{N8N_PORT:-5678\}:5678/);
  assert.match(compose, /portfolio-gateway:[\s\S]*?restart:\s*unless-stopped/);
  assert.match(compose, /ngrok:[\s\S]*?restart:\s*unless-stopped/);
  assert.match(compose, /--domain=\$\{NGROK_DOMAIN\}/);
  assert.match(compose, /portfolio-gateway:8080/);
  assert.match(compose, /fetch\('http:\/\/localhost:8080\/health'\)/);
  assert.match(compose, /EXECUTIONS_DATA_SAVE_ON_SUCCESS:\s*["']?none["']?/);

  const gatewaySection = compose.split(/^\s{2}portfolio-gateway:\s*$/m)[1]?.split(/^\s{2}\S/m)[0] ?? '';
  assert.doesNotMatch(gatewaySection, /^\s+ports:/m);
  assert.doesNotMatch(compose, /^\s{2}ollama:/m);
  assert.doesNotMatch(compose, /11434:11434/);
});

test('reports healthy n8n and Ollama with installed models', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/healthz')) return new Response('ok');
    if (String(url).endsWith('/api/tags')) {
      return Response.json({ models: [{ name: 'qwen3:4b' }] });
    }
    return new Response('not found', { status: 404 });
  };

  try {
    const { checkEnvironment } = await import('../scripts/check-environment.mjs');
    const report = await checkEnvironment({
      n8nUrl: 'http://n8n.test',
      ollamaUrl: 'http://ollama.test',
    });
    assert.deepEqual(report, {
      n8n: 'ok',
      ollama: 'ok',
      models: ['qwen3:4b'],
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('reports unreachable services without throwing', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new TypeError('connection refused');
  };

  try {
    const { checkEnvironment } = await import('../scripts/check-environment.mjs');
    const report = await checkEnvironment({
      n8nUrl: 'http://n8n.test',
      ollamaUrl: 'http://ollama.test',
    });
    assert.deepEqual(report, {
      n8n: 'unreachable',
      ollama: 'unreachable',
      models: [],
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
