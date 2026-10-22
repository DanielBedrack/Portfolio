import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const workflowsUrl = new URL("../workflows/", import.meta.url);
const secretKeys = /^(?:password|passphrase|access[_-]?token|refresh[_-]?token|client[_-]?secret|api[_-]?key|authorization|secret|token)$/i;
const secretValuePatterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b(?:sk-(?:proj-)?|gh[pousr]_)[A-Za-z0-9_-]{20,}/,
  /\bBearer\s+[A-Za-z0-9._~-]{20,}/i,
];

function isSafePlaceholder(value) {
  return (
    value === "" ||
    /^=\{\{.*\}\}$/.test(value) ||
    /^\$\{[A-Z0-9_]+\}$/.test(value) ||
    /^<[^>]+>$/.test(value) ||
    /^(?:redacted|placeholder)$/i.test(value)
  );
}

export function scanForSecrets(value) {
  const findings = [];

  function add(path, kind) {
    const key = `${path}:${kind}`;
    if (!findings.some((finding) => `${finding.path}:${finding.kind}` === key)) {
      findings.push({ path, kind });
    }
  }

  function scan(current, path) {
    if (Array.isArray(current)) {
      current.forEach((item, index) => scan(item, `${path}/${index}`));
      return;
    }
    if (!current || typeof current !== "object") {
      if (typeof current === "string" && secretValuePatterns.some((pattern) => pattern.test(current))) {
        add(path, "secret-like-value");
      }
      return;
    }

    for (const [key, child] of Object.entries(current)) {
      const childPath = `${path}/${key}`;
      if (secretKeys.test(key) && typeof child === "string" && !isSafePlaceholder(child)) {
        add(childPath, "secret-field");
      }
      if (key === "credentials" && child && typeof child === "object" && !Array.isArray(child)) {
        for (const [credentialType, reference] of Object.entries(child)) {
          if (!reference || typeof reference !== "object" || Array.isArray(reference)) {
            add(`${childPath}/${credentialType}`, "invalid-credential-reference");
            continue;
          }
          for (const referenceKey of Object.keys(reference)) {
            if (!new Set(["id", "name"]).has(referenceKey)) {
              add(`${childPath}/${credentialType}/${referenceKey}`, "credential-material");
            }
          }
        }
      }
      scan(child, childPath);
    }
  }

  scan(value, "$");
  return findings;
}

async function workflowFiles() {
  const entries = await readdir(workflowsUrl, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"));
}

async function main() {
  const files = await workflowFiles();
  const findings = [];
  for (const file of files) {
    const value = JSON.parse(await readFile(new URL(file.name, workflowsUrl), "utf8"));
    for (const finding of scanForSecrets(value)) {
      findings.push({ file: file.name, ...finding });
    }
  }
  if (findings.length) {
    for (const finding of findings) {
      console.error(`${finding.file}${finding.path}: ${finding.kind}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(`Secret scan passed for ${files.length} production workflow export(s).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
