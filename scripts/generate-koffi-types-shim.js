#!/usr/bin/env node

/**
 * Regenerates src/types/koffi.d.ts from the currently installed koffi
 * package's index.d.ts. Run this after bumping the koffi dependency.
 *
 * See the header comment in src/types/koffi.d.ts for why this shim exists.
 */

const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'node_modules', 'koffi', 'index.d.ts');
const TARGET = path.join(__dirname, '..', 'src', 'types', 'koffi.d.ts');

const HEADER = `// Local ambient type shim for the 'koffi' package.
//
// WHY THIS FILE EXISTS:
// koffi's package.json sets "type": "module" but ships a single
// untyped-per-condition "types" entry (no separate index.d.cts for the
// require() condition). Under TypeScript's node16/nodenext module
// resolution, that makes TS treat koffi as ESM-only and refuse to
// typecheck \`import * as koffi from 'koffi'\` from this project's
// CommonJS sources (TS1479/TS1471), even though koffi works correctly
// at runtime via require() (it ships index.cjs for that condition).
//
// This is a koffi packaging gap, not a bug in this project's code —
// upstream would need to add index.d.cts + conditional "types" exports
// to fix it properly (https://koffi.dev).
//
// This file re-declares koffi's real, unmodified type surface as an
// ambient module local to this project. Ambient module declarations are
// resolved by name directly against the TS program, bypassing
// node_modules package.json/exports-based resolution entirely — so this
// sidesteps the ESM/CJS check while keeping full type fidelity.
//
// TO REGENERATE after bumping the koffi dependency, run:
//   node scripts/generate-koffi-types-shim.js
//
// Content below is copied verbatim from node_modules/koffi/index.d.ts
// (version installed at generation time), wrapped in an ambient module
// block. Do not hand-edit — regenerate instead.

`;

const body = fs.readFileSync(SOURCE, 'utf8');
const indented = body
  .split('\n')
  .map((line) => (line ? '  ' + line : line))
  .join('\n');

const output = `${HEADER}declare module 'koffi' {\n${indented}\n}\n`;

fs.writeFileSync(TARGET, output);

const koffiPkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'node_modules', 'koffi', 'package.json'), 'utf8')
);
console.log(`Wrote ${TARGET} from koffi@${koffiPkg.version}`);
