import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateWorkflowExport } from "../scripts/validate-workflows.mjs";

const root = new URL("../", import.meta.url);

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

function nodeByName(workflow, name) {
  const node = workflow.nodes.find((candidate) => candidate.name === name);
  assert.ok(node, `Missing node: ${name}`);
  return node;
}

function reachableNodeNames(workflow, startName, outputIndex = null) {
  const visited = new Set();
  const queue = [];
  const ports = workflow.connections[startName]?.main ?? [];
  const groups = outputIndex === null ? ports : [ports[outputIndex] ?? []];
  for (const group of groups) {
    for (const edge of group) queue.push(edge.node);
  }

  while (queue.length) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    for (const group of workflow.connections[current]?.main ?? []) {
      for (const edge of group) queue.push(edge.node);
    }
  }
  return visited;
}

async function runCodeNode(node, json) {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  return new AsyncFunction("$json", node.parameters.jsCode)(json);
}

test("chat fixtures cover grounded English, Hebrew, refusal and language switching", async () => {
  const cases = await readJson("test-fixtures/chat-cases.json");
  assert.deepEqual(
    cases.slice(0, 5).map(({ caseId }) => caseId),
    [
      "chat-en-focus",
      "chat-he-project",
      "chat-en-missing-metric",
      "chat-he-no-invention",
      "chat-language-switch",
    ],
  );
  assert.ok(cases.slice(0, 5).every((entry) => entry.requiredFacts.length > 0));
  assert.ok(cases.slice(0, 5).every((entry) => entry.forbiddenClaims.length > 0));
  assert.deepEqual(cases[4].expectedLanguageSequence, ["he", "en"]);
  assert.equal(new Set(cases.map(({ sessionId }) => sessionId)).size, cases.length);
});

test("chat fixtures cover the complete consented contact conversation matrix", async () => {
  const cases = await readJson("test-fixtures/chat-cases.json");
  const contactCases = cases.slice(5);

  assert.deepEqual(
    contactCases.map(({ caseId }) => caseId),
    [
      "contact-chat-hebrew-consent",
      "contact-chat-english-consent",
      "contact-chat-consent-refused",
      "contact-chat-no-premature-personal-data",
      "contact-chat-invalid-email-correction",
      "contact-chat-duplicate",
      "contact-chat-storage-failure",
      "contact-chat-gmail-unknown",
      "contact-chat-message-prompt-injection",
    ],
  );
  assert.deepEqual(
    contactCases.map(({ expectedToolCalls }) => expectedToolCalls),
    [1, 1, 0, 0, 1, 1, 1, 1, 1],
  );
  assert.equal(contactCases.at(-1).messageRemainsData, true);
});

test("contact fixtures cover validation, duplicate and notification outcomes", async () => {
  const cases = await readJson("test-fixtures/contact-cases.json");

  assert.deepEqual(
    cases.map(({ caseId }) => caseId),
    [
      "contact-declined-consent",
      "contact-missing-fields",
      "contact-invalid-email",
      "contact-valid-hebrew",
      "contact-valid-english",
      "contact-duplicate",
      "contact-storage-failure",
      "contact-gmail-failure",
      "contact-gmail-unknown",
    ],
  );
  assert.ok(cases.every(({ input }) => input.message.includes("LOCAL TEST")));
  assert.ok(cases.every(({ input }) => !Object.hasOwn(input, "requestId")));
});

test("lead subworkflow is inactive, credential-free and keeps simulation external-free", async () => {
  const workflow = await readJson("workflows/save-portfolio-lead.json");
  assert.deepEqual(validateWorkflowExport(workflow), { valid: true, errors: [] });
  assert.equal(workflow.active, false);
  assert.equal(workflow.nodes[0].type, "n8n-nodes-base.executeWorkflowTrigger");
  assert.ok(workflow.nodes.every((node) => node.credentials === undefined));
  const simulationBranch = reachableNodeNames(workflow, "Simulation Enabled?", 0);
  const externalNodeNames = new Set(
    workflow.nodes
      .filter((node) =>
        ["n8n-nodes-base.googleSheets", "n8n-nodes-base.gmail"].includes(node.type),
      )
      .map(({ name }) => name),
  );
  assert.ok([...simulationBranch].every((name) => !externalNodeNames.has(name)));
});

test("lead validation rejects declined consent and invalid email before adapters", async () => {
  const workflow = await readJson("workflows/save-portfolio-lead.json");
  const fixtures = await readJson("test-fixtures/contact-cases.json");
  const validationNode = nodeByName(workflow, "Normalize and Validate Lead");
  const validBranch = reachableNodeNames(workflow, "Valid Lead?", 0);
  const invalidBranch = reachableNodeNames(workflow, "Valid Lead?", 1);

  for (const caseId of ["contact-declined-consent", "contact-invalid-email"]) {
    const fixture = fixtures.find((candidate) => candidate.caseId === caseId);
    const [result] = await runCodeNode(validationNode, fixture.input);
    assert.equal(result.json.valid, false, caseId);
  }

  assert.ok(validBranch.has("Simulation Adapter"));
  assert.ok(!invalidBranch.has("Simulation Adapter"));
  assert.ok(invalidBranch.has("Invalid Result"));
});

test("lead validation rejects contact details that were not supplied by the visitor", async () => {
  const workflow = await readJson("workflows/save-portfolio-lead.json");
  const validationNode = nodeByName(workflow, "Normalize and Validate Lead");
  const [result] = await runCodeNode(validationNode, {
    name: "אורח",
    email: "example@example.com",
    message: "אני רוצה שדניאל יחזור אליי.",
    sourceText: "כן, אני מסכים.",
    language: "he",
    consent: true,
    sessionId: "fixture-invented-fields",
  });

  assert.equal(result.json.valid, false);
  assert.deepEqual(result.json.validationErrors, ["name_source", "email_source", "message_source"]);
});

test("lead validation normalizes harmless whitespace around the language code", async () => {
  const workflow = await readJson("workflows/save-portfolio-lead.json");
  const validationNode = nodeByName(workflow, "Normalize and Validate Lead");
  const sourceText = "שם: בדיקה מקומית; אימייל: local-test@example.com; הודעה: בדיקה בלבד.";
  const [result] = await runCodeNode(validationNode, {
    name: "בדיקה מקומית",
    email: "local-test@example.com",
    message: "בדיקה בלבד.",
    sourceText,
    language: "he ",
    consent: true,
    sessionId: "fixture-language-whitespace",
  });

  assert.equal(result.json.valid, true);
  assert.equal(result.json.language, "he");
  assert.deepEqual(result.json.validationErrors, []);
});

test("lead validation preserves exact Hebrew labeled fields from the visitor message", async () => {
  const workflow = await readJson("workflows/save-portfolio-lead.json");
  const validationNode = nodeByName(workflow, "Normalize and Validate Lead");
  const sourceText = "אני מסכים שתשמור את הפנייה. שם: בדיקת רגרסיה; אימייל: local-regression@example.com; הודעה: בדיקת תיקון בלבד.";
  const [result] = await runCodeNode(validationNode, {
    name: "בדיקה רגרסיה",
    email: "local-regression@example.com",
    message: "בדיקה תיקון בלבד.",
    sourceText,
    language: "he",
    consent: true,
    sessionId: "fixture-exact-hebrew-fields",
  });

  assert.equal(result.json.valid, true);
  assert.equal(result.json.name, "בדיקת רגרסיה");
  assert.equal(result.json.message, "בדיקת תיקון בלבד.");
  assert.deepEqual(result.json.validationErrors, []);
});

test("invalid invented details return a precise collection prompt", async () => {
  const workflow = await readJson("workflows/save-portfolio-lead.json");
  const invalidNode = nodeByName(workflow, "Invalid Result");
  const [result] = await runCodeNode(invalidNode, {
    language: "he",
    validationErrors: ["name_source", "email_source", "message_source"],
  });

  assert.equal(result.json.status, "invalid");
  assert.equal(
    result.json.safeMessage,
    "נא לשלוח בהודעה אחת את השם, כתובת האימייל וההודעה שברצונך להעביר לדניאל.",
  );
});

test("lead simulation maps success, failure and unknown without external calls", async () => {
  const workflow = await readJson("workflows/save-portfolio-lead.json");
  const simulationNode = nodeByName(workflow, "Simulation Adapter");
  const expectations = {
    success: "simulated_success",
    failure: "simulated_failure",
    unknown: "simulated_unknown",
  };

  for (const [simulationOutcome, status] of Object.entries(expectations)) {
    const [result] = await runCodeNode(simulationNode, {
      requestId: "a".repeat(64),
      language: "en",
      simulationOutcome,
    });
    assert.deepEqual(
      {
        status: result.json.status,
        stored: result.json.stored,
        notificationAttempted: result.json.notificationAttempted,
        simulated: result.json.simulated,
      },
      { status, stored: false, notificationAttempted: false, simulated: true },
    );
    assert.match(result.json.safeMessage, /simulation/i);
  }
});

test("lead request ID uses SHA-256 after validation", async () => {
  const workflow = await readJson("workflows/save-portfolio-lead.json");
  const cryptoNode = nodeByName(workflow, "Generate Request ID");
  const validBranch = [...reachableNodeNames(workflow, "Valid Lead?", 0)];

  assert.equal(cryptoNode.type, "n8n-nodes-base.crypto");
  assert.equal(cryptoNode.parameters.action, "hash");
  assert.equal(cryptoNode.parameters.type, "SHA256");
  assert.equal(cryptoNode.parameters.encoding, "hex");
  assert.equal(cryptoNode.parameters.dataPropertyName, "requestId");
  assert.match(cryptoNode.parameters.value, /requestMaterial/);
  assert.ok(validBranch.indexOf("Generate Request ID") < validBranch.indexOf("Simulation Adapter"));
});

test("sheet duplicate lookup precedes append and duplicate bypasses the write", async () => {
  const workflow = await readJson("workflows/save-portfolio-lead.json");
  const simulationOffBranch = reachableNodeNames(workflow, "Simulation Enabled?", 1);
  const duplicateBranch = reachableNodeNames(workflow, "Duplicate Lead?", 0);
  const newLeadBranch = reachableNodeNames(workflow, "Duplicate Lead?", 1);

  nodeByName(workflow, "Lookup Existing Lead");
  nodeByName(workflow, "Append Lead");
  assert.ok(simulationOffBranch.has("Lookup Existing Lead"));
  assert.ok(simulationOffBranch.has("Append Lead"));
  assert.ok(duplicateBranch.has("Duplicate Result"));
  assert.ok(!duplicateBranch.has("Append Lead"));
  assert.ok(newLeadBranch.has("Append Lead"));
});

test("sheet append maps exactly the eight lead columns", async () => {
  const workflow = await readJson("workflows/save-portfolio-lead.json");
  const appendNode = nodeByName(workflow, "Append Lead");
  const expectedColumns = [
    "createdAt",
    "language",
    "name",
    "email",
    "message",
    "consent",
    "requestId",
    "emailStatus",
  ];

  assert.equal(appendNode.type, "n8n-nodes-base.googleSheets");
  assert.equal(appendNode.parameters.operation, "append");
  assert.deepEqual(Object.keys(appendNode.parameters.columns.value), expectedColumns);
  assert.equal(appendNode.parameters.columns.value.emailStatus, "not_attempted");
});

test("all sheet adapters use the same public-safe document ID placeholder", async () => {
  const workflow = await readJson("workflows/save-portfolio-lead.json");
  const sheetNodeNames = [
    "Lookup Existing Lead",
    "Append Lead",
    "Confirm Append Outcome",
    "Update Email Status",
  ];
  const documentIds = sheetNodeNames.map((name) => {
    const documentId = nodeByName(workflow, name).parameters.documentId;
    assert.equal(documentId.mode, "id");
    assert.ok(documentId.value);
    return documentId.value;
  });

  assert.equal(new Set(documentIds).size, 1);
  assert.equal(documentIds[0], "REPLACE_WITH_YOUR_GOOGLE_SHEET_ID");
});

test("unknown append outcome is looked up once and never retried", async () => {
  const workflow = await readJson("workflows/save-portfolio-lead.json");
  const appendErrorBranch = reachableNodeNames(workflow, "Append Lead", 1);
  const confirmationFoundBranch = reachableNodeNames(workflow, "Append Confirmed?", 0);
  const confirmationMissingBranch = reachableNodeNames(workflow, "Append Confirmed?", 1);

  assert.ok(appendErrorBranch.has("Confirm Append Outcome"));
  assert.ok(appendErrorBranch.has("Append Confirmed?"));
  assert.ok(!appendErrorBranch.has("Append Lead"));
  assert.ok(confirmationFoundBranch.has("Storage Confirmed"));
  assert.ok(confirmationMissingBranch.has("Storage Failed Result"));
});

test("successful append is read back before notification and status update", async () => {
  const workflow = await readJson("workflows/save-portfolio-lead.json");
  const appendSuccessTargets = workflow.connections["Append Lead"].main[0].map(
    ({ node }) => node,
  );
  const confirmationFoundBranch = reachableNodeNames(workflow, "Append Confirmed?", 0);

  assert.deepEqual(appendSuccessTargets, ["Confirm Append Outcome"]);
  assert.ok(confirmationFoundBranch.has("Storage Confirmed"));
  assert.ok(confirmationFoundBranch.has("Send Gmail"));
  assert.ok(confirmationFoundBranch.has("Update Email Status"));
});

test("duplicate and storage failure results never attempt notification", async () => {
  const workflow = await readJson("workflows/save-portfolio-lead.json");
  const duplicateNode = nodeByName(workflow, "Duplicate Result");
  const failedNode = nodeByName(workflow, "Storage Failed Result");
  const base = { requestId: "b".repeat(64), language: "en" };
  const [duplicate] = await runCodeNode(duplicateNode, base);
  const [failed] = await runCodeNode(failedNode, base);

  assert.deepEqual(
    {
      status: duplicate.json.status,
      stored: duplicate.json.stored,
      notificationAttempted: duplicate.json.notificationAttempted,
    },
    { status: "duplicate", stored: true, notificationAttempted: false },
  );
  assert.deepEqual(
    {
      status: failed.json.status,
      stored: failed.json.stored,
      notificationAttempted: failed.json.notificationAttempted,
    },
    { status: "storage_failed", stored: false, notificationAttempted: false },
  );
});

test("gmail is reachable only after confirmed storage", async () => {
  const workflow = await readJson("workflows/save-portfolio-lead.json");
  nodeByName(workflow, "Send Gmail");

  const confirmedStorageBranch = reachableNodeNames(workflow, "Storage Confirmed");
  const duplicateBranch = reachableNodeNames(workflow, "Duplicate Result");
  const storageFailureBranch = reachableNodeNames(workflow, "Storage Failed Result");

  assert.ok(confirmedStorageBranch.has("Send Gmail"));
  assert.ok(!duplicateBranch.has("Send Gmail"));
  assert.ok(!storageFailureBranch.has("Send Gmail"));
});

test("gmail notification fixes the recipient and limits message fields", async () => {
  const workflow = await readJson("workflows/save-portfolio-lead.json");
  const gmailNode = nodeByName(workflow, "Send Gmail");
  const serializedMessage = JSON.stringify({
    subject: gmailNode.parameters.subject,
    message: gmailNode.parameters.message,
  });

  assert.equal(gmailNode.type, "n8n-nodes-base.gmail");
  assert.equal(gmailNode.parameters.resource, "message");
  assert.equal(gmailNode.parameters.operation, "send");
  assert.equal(gmailNode.parameters.sendTo, "danielbedrack@gmail.com");
  assert.match(gmailNode.parameters.subject, /Portfolio chatbot inquiry/);
  for (const allowedField of ["name", "email", "message", "language", "requestId"]) {
    assert.match(serializedMessage, new RegExp(allowedField));
  }
  for (const forbiddenField of [
    "sessionId",
    "requestMaterial",
    "consent",
    "validationErrors",
    "createdAt",
  ]) {
    assert.doesNotMatch(serializedMessage, new RegExp(forbiddenField));
  }
});

test("gmail outcomes update the confirmed sheet row and map final result", async () => {
  const workflow = await readJson("workflows/save-portfolio-lead.json");
  const confirmationNode = nodeByName(workflow, "Evaluate Append Confirmation");
  const storageNode = nodeByName(workflow, "Storage Confirmed");
  const updateNode = nodeByName(workflow, "Update Email Status");
  const resultNode = nodeByName(workflow, "Notification Result");

  assert.match(confirmationNode.parameters.jsCode, /row_number/);
  assert.match(storageNode.parameters.jsCode, /\$json/);
  assert.equal(updateNode.type, "n8n-nodes-base.googleSheets");
  assert.equal(updateNode.parameters.operation, "update");
  assert.equal(updateNode.parameters.columns.mappingMode, "autoMapInputData");
  assert.deepEqual(updateNode.parameters.columns.matchingColumns, ["row_number"]);
  assert.equal(updateNode.parameters.options.handlingExtraData, "ignoreIt");

  const expectations = {
    sent: "stored_and_notified",
    failed: "stored_notification_failed",
    unknown: "stored_notification_unknown",
  };
  for (const [emailStatus, status] of Object.entries(expectations)) {
    const [result] = await runCodeNode(resultNode, {
      requestId: "c".repeat(64),
      language: "en",
      emailStatus,
    });
    assert.deepEqual(
      {
        status: result.json.status,
        stored: result.json.stored,
        notificationAttempted: result.json.notificationAttempted,
      },
      { status, stored: true, notificationAttempted: true },
    );
  }
});

test("notification result survives a zero-item sheet update without losing the Gmail outcome", async () => {
  const workflow = await readJson("workflows/save-portfolio-lead.json");
  const updateNode = nodeByName(workflow, "Update Email Status");
  const resultNode = nodeByName(workflow, "Notification Result");
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const requestId = "d".repeat(64);
  const nodeOutputs = {
    "Gmail Sent Outcome": {
      isExecuted: true,
      first: () => ({ json: { requestId, language: "he", emailStatus: "sent" } }),
    },
    "Gmail Unknown Outcome": { isExecuted: false },
    "Gmail Failed Outcome": { isExecuted: false },
  };
  const lookup = (name) => nodeOutputs[name] ?? { isExecuted: false };

  assert.equal(updateNode.alwaysOutputData, true);
  const [result] = await new AsyncFunction("$json", "$", resultNode.parameters.jsCode)(
    {},
    lookup,
  );
  assert.deepEqual(result.json, {
    requestId,
    status: "stored_and_notified",
    stored: true,
    notificationAttempted: true,
    safeMessage: "הפנייה נשמרה ונשלחה לדניאל.",
  });
});

test("unknown gmail outcome is not retried", async () => {
  const workflow = await readJson("workflows/save-portfolio-lead.json");
  const unknownBranch = reachableNodeNames(workflow, "Gmail Unknown Outcome");

  assert.ok(unknownBranch.has("Update Email Status"));
  assert.ok(unknownBranch.has("Notification Result"));
  assert.ok(!unknownBranch.has("Send Gmail"));
});

test("portfolio chat export is inactive and contains the four learning nodes", async () => {
  const workflow = await readJson("workflows/portfolio-chat.json");
  const result = validateWorkflowExport(workflow);
  assert.deepEqual(result, { valid: true, errors: [] });

  const nodeTypes = workflow.nodes.map(({ type }) => type);
  assert.ok(nodeTypes.includes("@n8n/n8n-nodes-langchain.chatTrigger"));
  assert.ok(nodeTypes.includes("@n8n/n8n-nodes-langchain.agent"));
  assert.ok(nodeTypes.includes("@n8n/n8n-nodes-langchain.lmChatOllama"));
  assert.ok(nodeTypes.includes("@n8n/n8n-nodes-langchain.memoryBufferWindow"));
});

test("portfolio chat export pins local Ollama and the approved grounding rules", async () => {
  const workflow = await readJson("workflows/portfolio-chat.json");
  const serialized = JSON.stringify(workflow);
  const ollamaNode = nodeByName(workflow, "Ollama Chat Model");

  assert.equal(ollamaNode.parameters.model, "qwen3:4b-instruct");
  assert.equal(ollamaNode.credentials, undefined);
  assert.match(serialized, /Daniel is an AI and Automation Developer and Technical Project Manager\./);
  assert.match(serialized, /Do not provide exact performance or outcome metrics because none are approved\./);
  assert.match(serialized, /latest visitor message/i);
  assert.match(serialized, /untrusted data/i);
  assert.match(serialized, /sessionId/);
  assert.doesNotMatch(serialized, /currently works at Optimate/i);
});

test("portfolio chat exposes only one consent-gated lead subworkflow tool", async () => {
  const workflow = await readJson("workflows/portfolio-chat.json");
  const toolNodes = workflow.nodes.filter((node) =>
    workflow.connections[node.name]?.ai_tool?.flat().some(({ node: target }) => target === "AI Agent"),
  );

  assert.equal(toolNodes.length, 1);
  const [leadTool] = toolNodes;
  assert.equal(leadTool.type, "@n8n/n8n-nodes-langchain.toolWorkflow");
  assert.equal(leadTool.typeVersion, 2.2);
  assert.equal(leadTool.name, "save_portfolio_lead");
  assert.ok(!leadTool.parameters.source || leadTool.parameters.source === "database");
  assert.deepEqual(
    leadTool.parameters.workflowInputs.schema.map(({ id }) => id),
    ["name", "email", "message", "sourceText", "language", "consent", "sessionId"],
  );
  assert.equal(
    leadTool.parameters.workflowInputs.value.sourceText,
    "={{ $('When chat message received').item.json.chatInput }}",
  );
  assert.equal(
    leadTool.parameters.workflowInputs.value.sessionId,
    "={{ $('When chat message received').item.json.sessionId }}",
  );
  assert.ok(workflow.nodes.every((node) => ![
    "n8n-nodes-base.googleSheetsTool",
    "n8n-nodes-base.gmailTool",
  ].includes(node.type)));
});

test("inactive portfolio chat calls the published simulation subworkflow by ID", async () => {
  const workflow = await readJson("workflows/portfolio-chat.json");
  const leadTool = nodeByName(workflow, "save_portfolio_lead");

  assert.ok(!leadTool.parameters.source || leadTool.parameters.source === "database");
  assert.equal(leadTool.parameters.workflowId.value, "87WlOR7gNj1u97O1");
  assert.equal(leadTool.parameters.workflowJson, undefined);
});

test("portfolio chat prompt gates personal data and maps every lead result honestly", async () => {
  const workflow = await readJson("workflows/portfolio-chat.json");
  const agent = nodeByName(workflow, "AI Agent");
  const prompt = agent.parameters.options.systemMessage;

  assert.match(prompt, /private Google Sheet/i);
  assert.match(prompt, /Google.*פרטי/u);
  assert.match(prompt, /before asking for.*name.*email.*message/is);
  assert.match(prompt, /stored_and_notified/);
  assert.match(prompt, /stored_notification_failed/);
  assert.match(prompt, /stored_notification_unknown/);
  assert.match(prompt, /simulated_success/);
  assert.match(prompt, /simulated_failure/);
  assert.match(prompt, /simulated_unknown/);
  assert.match(prompt, /duplicate/);
  assert.match(prompt, /invalid/);
  assert.match(prompt, /storage_failed/);
  assert.match(prompt, /visitor.*message.*untrusted data/is);
});
