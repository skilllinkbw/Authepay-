/**
 * Generates the partner-facing Markdown copies of the legal documents from
 * the single source of truth in lib/legal/policies.ts.
 *
 * Usage: node scripts/export-legal.mjs
 * Output: legal/<policy-id>.md  (committed to the repo for partners/auditors)
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { POLICIES } from "../lib/legal/policies.ts";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const outDir = join(root, "legal");
mkdirSync(outDir, { recursive: true });

for (const policy of POLICIES) {
  const lines = [
    `# AuthePay — ${policy.title}`,
    "",
    `**Version:** ${policy.version}  `,
    `**Status:** ${policy.status}  `,
    `**Last updated:** ${policy.lastUpdated}`,
    "",
    `> ${policy.summary}`,
    "",
  ];
  for (const section of policy.sections) {
    lines.push(`## ${section.heading}`, "");
    for (const paragraph of section.paragraphs) {
      lines.push(paragraph, "");
    }
  }
  writeFileSync(join(outDir, `${policy.id}.md`), lines.join("\n"), "utf8");
  console.log(`wrote legal/${policy.id}.md`);
}
