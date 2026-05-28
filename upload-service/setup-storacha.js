/**
 * One-time setup — mirrors https://docs.storacha.network/how-to/upload/
 *
 * Option A (recommended): delegated credentials
 *   1. npm run keygen
 *   2. npx @storacha/cli login YOUR_EMAIL
 *   3. npx @storacha/cli space use did:key:YOUR_SPACE
 *   4. npx @storacha/cli delegation create <AGENT_DID> \
 *        --can space/blob/add --can space/index/add \
 *        --can filecoin/offer --can upload/add --base64
 *   5. Paste proof into STORACHA_PROOF in .env
 *
 * Option B: email login
 *   1. Set STORACHA_EMAIL + STORACHA_SPACE_DID in .env
 *   2. npm run setup  (click email link on first run)
 */
import dotenv from "dotenv";
import { createStorachaClient, uploadFile } from "./storacha-client.js";

dotenv.config();

console.log("Storacha setup — https://docs.storacha.network/how-to/upload/\n");

try {
  const { client, spaceDid, mode } = await createStorachaClient();

  const file = new File(
    [JSON.stringify({ source: "coffeechain-setup", at: new Date().toISOString() }, null, 2)],
    "coffeechain-setup.json",
    { type: "application/json" }
  );
  const cid = await uploadFile(client, file);

  console.log("\nSetup complete.");
  console.log(`Mode:  ${mode}`);
  console.log(`Agent: ${client.agent.did()}`);
  console.log(`Space: ${spaceDid}`);
  console.log(`CID:   ${cid}`);
  console.log(`URL:   https://w3s.link/ipfs/${cid}`);
} catch (error) {
  console.error("\nSetup failed:", error.message);
  if (error.cause?.message) console.error("Cause:", error.cause.message);
  process.exit(1);
}
