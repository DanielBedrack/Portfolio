import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import Ajv from "ajv";

const schemaUrl = new URL("../contracts/portfolio-knowledge.schema.json", import.meta.url);
const knowledgeUrl = new URL("../knowledge/portfolio-approved.json", import.meta.url);
const schema = JSON.parse(await readFile(schemaUrl, "utf8"));
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

function errorPath(error) {
  const suffix = error.params.missingProperty ?? error.params.additionalProperty;
  const base = error.instancePath || "";
  return suffix ? `${base}/${suffix}` : base || "/";
}

export function validateKnowledge(value) {
  const valid = validate(value);
  return {
    valid,
    errors: valid
      ? []
      : validate.errors.map((error) => `${errorPath(error)}: ${error.message}`),
  };
}

async function main() {
  const knowledge = JSON.parse(await readFile(knowledgeUrl, "utf8"));
  const result = validateKnowledge(knowledge);
  if (!result.valid) {
    console.error(result.errors.join("\n"));
    process.exitCode = 1;
    return;
  }
  console.log(`Validated ${knowledge.version}: approved portfolio knowledge is valid.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
