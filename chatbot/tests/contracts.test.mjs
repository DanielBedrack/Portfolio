import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import Ajv from "ajv";
import addFormats from "ajv-formats";

import { validateKnowledge } from "../scripts/validate-knowledge.mjs";

const root = new URL("../", import.meta.url);

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function validatorFor(schemaName) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(await readJson(`contracts/${schemaName}`));
}

test("accepts the approved portfolio knowledge artifact", async () => {
  const knowledge = await readJson("knowledge/portfolio-approved.json");
  assert.deepEqual(validateKnowledge(knowledge), { valid: true, errors: [] });
});

test("rejects knowledge missing a required project", async () => {
  const knowledge = await readJson("knowledge/portfolio-approved.json");
  delete knowledge.projects.remindme;

  const result = validateKnowledge(knowledge);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("/projects/remindme")));
});

test("rejects unsupported project metrics with a readable JSON path", async () => {
  const knowledge = await readJson("knowledge/portfolio-approved.json");
  knowledge.projects.megureit.outcomeClaims[0].unsupportedMetric = "42%";

  const result = validateKnowledge(knowledge);
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("/projects/megureit/outcomeClaims/0/unsupportedMetric"),
    ),
  );
});

test("forbids a numeric score in a job-match result", async () => {
  const validate = await validatorFor("job-match-result.schema.json");
  const result = {
    language: "en",
    strongMatches: [],
    partialMatches: [],
    missingEvidence: ["Kubernetes"],
    followUpQuestions: [],
    score: 82,
  };

  assert.equal(validate(result), false);
  assert.ok(validate.errors.some((error) => error.keyword === "additionalProperties"));
});

function validContactRequest(overrides = {}) {
  return {
    consent: true,
    name: "Test Visitor",
    email: "visitor@example.com",
    message: "LOCAL TEST",
    language: "en",
    sessionId: "local-session-001",
    ...overrides,
  };
}

function validContactResult(status, overrides = {}) {
  const storedStatuses = new Set([
    "stored_and_notified",
    "stored_notification_failed",
    "stored_notification_unknown",
    "duplicate",
  ]);
  const attemptedStatuses = new Set([
    "stored_and_notified",
    "stored_notification_failed",
    "stored_notification_unknown",
  ]);

  return {
    requestId: `test-result-${status}`,
    status,
    stored: storedStatuses.has(status),
    notificationAttempted: attemptedStatuses.has(status),
    safeMessage: "Safe status for the visitor.",
    ...overrides,
  };
}

test("requires explicit storage and email consent", async () => {
  const validate = await validatorFor("contact-request.schema.json");

  assert.equal(validate(validContactRequest({ consent: false })), false);
  assert.equal(validate(validContactRequest({ consent: true })), true);
});

test("requires a session identifier", async () => {
  const validate = await validatorFor("contact-request.schema.json");
  const { sessionId: _sessionId, ...missingSessionId } = validContactRequest();

  assert.equal(validate(missingSessionId), false);
  assert.equal(validate(validContactRequest({ sessionId: "" })), false);
  assert.equal(validate(validContactRequest()), true);
});

test("rejects an invalid contact email", async () => {
  const validate = await validatorFor("contact-request.schema.json");

  assert.equal(validate(validContactRequest({ email: "not-an-email" })), false);
});

test("accepts Hebrew and English contract language values", async () => {
  const validateJobMatch = await validatorFor("job-match-result.schema.json");
  const validateContact = await validatorFor("contact-request.schema.json");

  for (const language of ["he", "en"]) {
    assert.equal(
      validateJobMatch({
        language,
        strongMatches: [],
        partialMatches: [],
        missingEvidence: [],
        followUpQuestions: [],
      }),
      true,
    );
    assert.equal(
      validateContact(validContactRequest({ language })),
      true,
    );
  }
});

test("rejects unexpected contact request properties", async () => {
  const validate = await validatorFor("contact-request.schema.json");

  assert.equal(validate(validContactRequest({ requestId: "caller-controlled" })), false);
});

test("accepts only the lead workflow statuses", async () => {
  const validate = await validatorFor("contact-result.schema.json");
  const statuses = [
    "stored_and_notified",
    "stored_notification_failed",
    "stored_notification_unknown",
    "duplicate",
    "invalid",
    "storage_failed",
  ];

  for (const status of statuses) {
    assert.equal(validate(validContactResult(status)), true, status);
  }

  assert.equal(validate(validContactResult("sent")), false);
  assert.equal(validate(validContactResult("pending")), false);
  assert.equal(validate(validContactResult("invalid", { extra: true })), false);
});

test("marks only stored statuses as stored", async () => {
  const validate = await validatorFor("contact-result.schema.json");

  for (const status of [
    "stored_and_notified",
    "stored_notification_failed",
    "stored_notification_unknown",
  ]) {
    assert.equal(validate(validContactResult(status)), true, status);
    assert.equal(validate(validContactResult(status, { stored: false })), false, status);
    assert.equal(
      validate(validContactResult(status, { notificationAttempted: false })),
      false,
      status,
    );
  }

  assert.equal(validate(validContactResult("duplicate")), true);
  assert.equal(validate(validContactResult("duplicate", { stored: false })), false);
  assert.equal(
    validate(validContactResult("duplicate", { notificationAttempted: true })),
    false,
  );

  for (const status of ["invalid", "storage_failed"]) {
    assert.equal(validate(validContactResult(status)), true, status);
    assert.equal(validate(validContactResult(status, { stored: true })), false, status);
    assert.equal(
      validate(validContactResult(status, { notificationAttempted: true })),
      false,
      status,
    );
  }
});
