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

test('does not declare secrets', async () => {
  const [compose, envExample] = await Promise.all([
    readText('compose.yaml'),
    readText('.env.example'),
  ]);
  const assignments = `${compose}\n${envExample}`
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => /password|token|secret|credential/iu.test(line));

  assert.deepEqual(assignments, []);
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
