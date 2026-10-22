import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { scanForSecrets } from "./check-secrets.mjs";

const workflowsUrl = new URL("../workflows/", import.meta.url);

function validateCredentialReferences(node, nodePath, errors) {
  if (node.credentials === undefined) return;
  if (!node.credentials || typeof node.credentials !== "object" || Array.isArray(node.credentials)) {
    errors.push(`${nodePath}/credentials must be an object of credential references.`);
    return;
  }
  for (const [type, reference] of Object.entries(node.credentials)) {
    if (!reference || typeof reference !== "object" || Array.isArray(reference)) {
      errors.push(`${nodePath}/credentials/${type} must contain only id and name.`);
      continue;
    }
    const keys = Object.keys(reference);
    if (keys.some((key) => !["id", "name"].includes(key))) {
      errors.push(`${nodePath}/credentials/${type} contains credential material.`);
    }
    if (keys.some((key) => typeof reference[key] !== "string" || !reference[key].trim())) {
      errors.push(`${nodePath}/credentials/${type} id and name must be non-empty strings.`);
    }
  }
}

export function validateWorkflowExport(value) {
  const workflows = Array.isArray(value) ? value : [value];
  const errors = [];
  const webhookPaths = new Set();
  const eventKeys = new Set();

  if (!workflows.length) errors.push("Workflow export array must not be empty.");

  workflows.forEach((workflow, workflowIndex) => {
    const prefix = Array.isArray(value) ? `$/${workflowIndex}` : "$";
    if (!workflow || typeof workflow !== "object" || Array.isArray(workflow)) {
      errors.push(`${prefix} must be a workflow object.`);
      return;
    }
    if (typeof workflow.name !== "string" || !workflow.name.trim()) {
      errors.push(`${prefix}/name must be a non-empty string.`);
    }
    if (workflow.active !== false) {
      errors.push(`${prefix}/active must be false for a repository export.`);
    }

    const nodes = workflow.nodes;
    const nodeNames = new Set();
    const nodeIds = new Set();
    if (!Array.isArray(nodes) || !nodes.length) {
      errors.push(`${prefix}/nodes must be a non-empty array.`);
    } else {
      nodes.forEach((node, nodeIndex) => {
        const nodePath = `${prefix}/nodes/${nodeIndex}`;
        if (!node || typeof node !== "object" || Array.isArray(node)) {
          errors.push(`${nodePath} must be an object.`);
          return;
        }
        for (const [field, seen, label] of [
          ["id", nodeIds, "node id"],
          ["name", nodeNames, "node name"],
        ]) {
          const fieldValue = node[field];
          if (typeof fieldValue !== "string" || !fieldValue.trim()) {
            errors.push(`${nodePath}/${field} must be a non-empty string.`);
          } else if (seen.has(fieldValue)) {
            errors.push(`${nodePath}/${field} duplicates ${label} '${fieldValue}'.`);
          } else {
            seen.add(fieldValue);
          }
        }
        if (typeof node.type !== "string" || !node.type.trim()) {
          errors.push(`${nodePath}/type must be a non-empty string.`);
        }
        if (typeof node.typeVersion !== "number" || node.typeVersion <= 0) {
          errors.push(`${nodePath}/typeVersion must be a positive number.`);
        }
        if (!node.parameters || typeof node.parameters !== "object" || Array.isArray(node.parameters)) {
          errors.push(`${nodePath}/parameters must be an object.`);
        } else {
          if (typeof node.parameters.path === "string" && node.type?.toLowerCase().includes("webhook")) {
            if (webhookPaths.has(node.parameters.path)) {
              errors.push(`${nodePath}/parameters/path duplicates webhook path '${node.parameters.path}'.`);
            }
            webhookPaths.add(node.parameters.path);
          }
          if (typeof node.parameters.eventKey === "string") {
            if (eventKeys.has(node.parameters.eventKey)) {
              errors.push(`${nodePath}/parameters/eventKey duplicates event key '${node.parameters.eventKey}'.`);
            }
            eventKeys.add(node.parameters.eventKey);
          }
        }
        validateCredentialReferences(node, nodePath, errors);
      });
    }

    const connections = workflow.connections;
    if (!connections || typeof connections !== "object" || Array.isArray(connections)) {
      errors.push(`${prefix}/connections must be an object.`);
    } else {
      for (const [source, ports] of Object.entries(connections)) {
        if (!nodeNames.has(source)) errors.push(`${prefix}/connections starts at unknown node '${source}'.`);
        if (!ports || typeof ports !== "object" || Array.isArray(ports)) {
          errors.push(`${prefix}/connections/${source} must contain output ports.`);
          continue;
        }
        for (const groups of Object.values(ports)) {
          if (!Array.isArray(groups)) {
            errors.push(`${prefix}/connections/${source} output groups must be arrays.`);
            continue;
          }
          for (const group of groups) {
            if (!Array.isArray(group)) {
              errors.push(`${prefix}/connections/${source} output must be an array.`);
              continue;
            }
            for (const edge of group) {
              if (!edge || typeof edge !== "object" || !nodeNames.has(edge.node)) {
                errors.push(`${prefix}/connections/${source} points at an unknown node.`);
                continue;
              }
              if (typeof edge.type !== "string" || !edge.type || !Number.isInteger(edge.index) || edge.index < 0) {
                errors.push(`${prefix}/connections/${source} has an invalid target descriptor.`);
              }
            }
          }
        }
      }
    }

    if (workflow.pinData && (typeof workflow.pinData !== "object" || Object.keys(workflow.pinData).length)) {
      errors.push(`${prefix}/pinData must be empty in repository exports.`);
    }

    for (const finding of scanForSecrets(workflow)) {
      errors.push(`${prefix}${finding.path.slice(1)} contains ${finding.kind}.`);
    }
  });

  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

async function main() {
  const entries = await readdir(workflowsUrl, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"));
  const workflows = [];
  for (const file of files) {
    workflows.push(JSON.parse(await readFile(new URL(file.name, workflowsUrl), "utf8")));
  }
  const result = validateWorkflowExport(workflows);
  if (!files.length) {
    console.log("No production workflow exports found; validation passed.");
    return;
  }
  if (!result.valid) {
    console.error(result.errors.join("\n"));
    process.exitCode = 1;
    return;
  }
  console.log(`Validated ${files.length} production workflow export(s).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
