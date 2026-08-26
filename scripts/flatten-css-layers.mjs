// Flattens CSS cascade layers (@layer) in the compiled Tailwind v4 output so
// the shipped stylesheet is plain CSS. Some consumer build pipelines (e.g.
// webpack + postcss-loader running Tailwind v3) reject `@layer` at-rules in
// already-compiled CSS ("@layer base is used but no matching @tailwind base
// directive is present"). Unwrapping the layers preserves rule order
// (theme -> base -> components -> utilities) while keeping the file
// consumable by any CSS pipeline.
import { readFileSync, writeFileSync } from "node:fs";
import postcss from "postcss";

const file = process.argv[2];
if (!file) {
  console.error("usage: node flatten-css-layers.mjs <css-file>");
  process.exit(1);
}

const css = readFileSync(file, "utf8");
const root = postcss.parse(css);

function unwrapLayers(container) {
  for (const node of [...(container.nodes ?? [])]) {
    if (node.type !== "atrule") {
      continue;
    }
    if (node.name === "layer") {
      if (!node.nodes || node.nodes.length === 0) {
        // Bare ordering statement: `@layer theme, base, components, utilities;`
        node.remove();
        continue;
      }
      unwrapLayers(node);
      node.replaceWith(node.nodes);
    } else if (node.nodes) {
      unwrapLayers(node);
    }
  }
}

unwrapLayers(root);

const before = (css.match(/@layer/g) ?? []).length;
const out = root.toString();
const after = (out.match(/@layer/g) ?? []).length;
if (after > 0) {
  console.error(`failed to flatten all @layer rules (${before} -> ${after})`);
  process.exit(1);
}

writeFileSync(file, out);
console.log(`flattened ${before} @layer rule(s) in ${file}`);
