import { pathToFileURL } from 'node:url';

const request = async (url) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return response.ok ? response : null;
  } catch {
    return null;
  }
};

export async function checkEnvironment({ n8nUrl, ollamaUrl }) {
  const [n8nResponse, ollamaResponse] = await Promise.all([
    request(`${n8nUrl.replace(/\/$/u, '')}/healthz`),
    request(`${ollamaUrl.replace(/\/$/u, '')}/api/tags`),
  ]);

  let models = [];
  if (ollamaResponse) {
    try {
      const body = await ollamaResponse.json();
      models = Array.isArray(body.models)
        ? body.models.map((model) => model.name).filter((name) => typeof name === 'string')
        : [];
    } catch {
      models = [];
    }
  }

  return {
    n8n: n8nResponse ? 'ok' : 'unreachable',
    ollama: ollamaResponse ? 'ok' : 'unreachable',
    models,
  };
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const report = await checkEnvironment({
    n8nUrl: process.env.N8N_URL ?? 'http://localhost:5678',
    ollamaUrl: process.env.OLLAMA_URL ?? 'http://localhost:11434',
  });

  console.log(JSON.stringify(report, null, 2));
  if (report.n8n !== 'ok' || report.ollama !== 'ok' || !report.models.includes('qwen3:4b')) {
    process.exitCode = 1;
  }
}
