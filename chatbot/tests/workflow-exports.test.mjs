import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { scanForSecrets } from "../scripts/check-secrets.mjs";
import { validateWorkflowExport } from "../scripts/validate-workflows.mjs";

const root = new URL("../", import.meta.url);

async function fixture(name) {
  return JSON.parse(await readFile(new URL(`test-fixtures/${name}`, root), "utf8"));
}

test("accepts the valid three-event fixture", async () => {
  assert.deepEqual(validateWorkflowExport(await fixture("workflow-valid.json")), {
    valid: true,
    errors: [],
  });
});

test("rejects missing nodes and malformed connections", async () => {
  const result = validateWorkflowExport(await fixture("workflow-invalid.json"));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("nodes")));
  assert.ok(result.errors.some((error) => error.includes("connections")));
});

test("rejects duplicate node IDs, webhook paths and event keys", async () => {
  const result = validateWorkflowExport(await fixture("workflow-duplicate-event.json"));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("node id")));
  assert.ok(result.errors.some((error) => error.includes("webhook path")));
  assert.ok(result.errors.some((error) => error.includes("event key")));
});

test("rejects active production triggers", async () => {
  const workflow = await fixture("workflow-valid.json");
  workflow.active = true;
  workflow.nodes[0] = {
    ...workflow.nodes[0],
    type: "n8n-nodes-base.webhook",
    parameters: { path: "active-production-hook" },
  };

  const result = validateWorkflowExport(workflow);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("active must be false")));
});

test("rejects dangling connection targets and pinned personal data", async () => {
  const workflow = await fixture("workflow-valid.json");
  workflow.connections["Manual Trigger"].main[0][0].node = "Missing Node";
  workflow.pinData = { "Sample Events": [{ json: { email: "person@example.com" } }] };

  const result = validateWorkflowExport(workflow);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("unknown node")));
  assert.ok(result.errors.some((error) => error.includes("pinData")));
});

test("allows credential references containing only id and display name", async () => {
  const workflow = await fixture("workflow-valid.json");
  workflow.nodes[1].credentials = {
    gmailOAuth2: { id: "credential-reference-id", name: "Local Gmail" },
  };

  assert.equal(validateWorkflowExport(workflow).valid, true);
  assert.deepEqual(scanForSecrets(workflow), []);
});

test("finds secret-like values without returning their contents", () => {
  const value = {
    password: "do-not-print-this",
    accessToken: "oauth-token-material",
    apiKey: "sk-proj-abcdefghijklmnopqrstuvwxyz123456",
    authorization: "Bearer abcdefghijklmnopqrstuvwxyz",
    credentials: {
      gmailOAuth2: {
        id: "reference-id",
        name: "Local Gmail",
        clientSecret: "hidden-client-secret",
      },
    },
  };

  const findings = scanForSecrets(value);
  assert.ok(findings.length >= 5);
  assert.ok(findings.every((finding) => !JSON.stringify(finding).includes("do-not-print-this")));
  assert.ok(findings.some((finding) => finding.path.includes("clientSecret")));
});

test("accepts an array of independently valid workflow exports", async () => {
  const first = await fixture("workflow-valid.json");
  const second = structuredClone(first);
  second.id = "portfolioValidatorFixture02";
  second.name = "Portfolio - second valid workflow";
  second.nodes[1].parameters.eventKey = "second-fixture-events";

  assert.equal(validateWorkflowExport([first, second]).valid, true);
});

test("keeps the public chat export inactive, local, and free of lead collection", async () => {
  const workflow = JSON.parse(await readFile(new URL("workflows/portfolio-chat.json", root), "utf8"));
  const chatTrigger = workflow.nodes.find((node) => node.name === "When chat message received");
  const model = workflow.nodes.find((node) => node.name === "Ollama Chat Model");
  const agent = workflow.nodes.find((node) => node.name === "AI Agent");

  assert.equal(workflow.active, false);
  assert.equal(chatTrigger.webhookId, "94c404d3-766e-4a0b-906c-517ad0b0815a");
  assert.deepEqual(model.parameters, {
    model: "qwen3:4b-instruct",
    options: {
      think: false,
      temperature: 0.2,
      numCtx: 4096,
      numPredict: 256,
      keepAlive: "30m",
    },
  });
  assert.equal(workflow.nodes.some((node) => node.name === "save_portfolio_lead"), false);
  assert.equal(Object.hasOwn(workflow.connections, "save_portfolio_lead"), false);
  assert.doesNotMatch(agent.parameters.options.systemMessage, /stored in Daniel's private Google Sheet|יישמרו בגיליון Google|save_portfolio_lead/iu);
  assert.match(agent.parameters.options.systemMessage, /danielbedrack@gmail\.com/iu);
  assert.match(agent.parameters.options.systemMessage, /do not (ask|request).*name.*email/isu);
});

test("configures the chat trigger to accept production webhook requests", async () => {
  const workflow = JSON.parse(await readFile(new URL("workflows/portfolio-chat.json", root), "utf8"));
  const chatTrigger = workflow.nodes.find((node) => node.name === "When chat message received");

  assert.equal(chatTrigger.parameters.public, true);
  assert.equal(chatTrigger.parameters.mode, "webhook");
});
