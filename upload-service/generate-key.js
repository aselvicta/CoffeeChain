/**
 * Step 1 of delegated setup — generates an upload-service agent key.
 * Step 2: run the printed `storacha delegation create` command.
 */
import { generate } from "@storacha/client/principal/ed25519";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const audienceDid = process.argv[2];

if (audienceDid) {
  console.log("\nRun these commands (Storacha CLI):\n");
  console.log(`  npx @storacha/cli login ${process.env.STORACHA_EMAIL || "YOUR_EMAIL"}`);
  console.log(`  npx @storacha/cli space use ${process.env.STORACHA_SPACE_DID || "YOUR_SPACE_DID"}`);
  console.log(
    `  npx @storacha/cli delegation create ${audienceDid} ` +
      `--can space/blob/add --can space/index/add --can filecoin/offer --can upload/add --base64`
  );
  console.log("\nPaste the base64 output into .env as STORACHA_PROOF=\n");
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
console.log(`  2. node generate-key.js ${did}`);
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
