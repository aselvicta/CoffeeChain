/**
 * Step 1 of delegated setup — generates an upload-service agent key.
 * Step 2: run the printed `storacha delegation create` command.
 */
import { generate } from "@storacha/client/principal/ed25519";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { normalizeStorachaKey, parseSigner } from "./storacha-client.js";

dotenv.config();

const arg = process.argv[2];
const existingKey = process.env.STORACHA_KEY || process.env.STORACHA_PRINCIPAL || "";

function printDelegationSteps(audienceDid) {
  console.log("\nRun these commands (Storacha CLI):\n");
  console.log(`  npx @storacha/cli login ${process.env.STORACHA_EMAIL || "YOUR_EMAIL"}`);
  console.log(`  npx @storacha/cli space use ${process.env.STORACHA_SPACE_DID || "YOUR_SPACE_DID"}`);
  console.log(
    `  npx @storacha/cli delegation create ${audienceDid} ` +
      `--can space/blob/add --can space/index/add --can filecoin/offer --can upload/add --base64`
  );
  console.log("\nPaste the base64 output into .env as STORACHA_PROOF=\n");
}

if (arg === "--show" || arg === "--did") {
  if (!existingKey) {
    console.error("No STORACHA_KEY in .env — run: npm run keygen");
    process.exit(1);
  }
  const principal = parseSigner(existingKey);
  const multibaseKey = normalizeStorachaKey(existingKey);
  console.log(`Agent DID: ${principal.did()}`);
  if (!existingKey.startsWith("M")) {
    console.log(`\nOptional: replace STORACHA_KEY with multibase form:\nSTORACHA_KEY=${multibaseKey}`);
  }
  printDelegationSteps(principal.did());
  process.exit(0);
}

if (arg?.startsWith("did:")) {
  printDelegationSteps(arg);
  process.exit(0);
}

if (existingKey) {
  const principal = parseSigner(existingKey);
  console.log("STORACHA_KEY already set in .env\n");
  console.log(`Agent DID: ${principal.did()}\n`);
  console.log("To print delegation commands again: npm run keygen -- --show");
  console.log("To generate a NEW key, remove STORACHA_KEY from .env first.\n");
  printDelegationSteps(principal.did());
  process.exit(0);
}

const signer = await generate();
const key = signer.toString();
const did = signer.did();

console.log("Generated upload-service agent (docs: storacha key create):\n");
console.log(`STORACHA_KEY=${key}`);
console.log(`Agent DID: ${did}\n`);
console.log("Next:");
console.log(`  1. Add STORACHA_KEY to .env`);
console.log(`  2. npm run keygen -- --show`);
console.log("  3. Paste STORACHA_PROOF from delegation output into .env");
console.log("  4. npm run setup");

const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  let env = fs.readFileSync(envPath, "utf8");
  if (!/STORACHA_KEY=/.test(env) && !/STORACHA_PRINCIPAL=/.test(env)) {
    env += `\nSTORACHA_KEY=${key}\n`;
    fs.writeFileSync(envPath, env);
    console.log("\nSaved STORACHA_KEY to .env");
  }
}
