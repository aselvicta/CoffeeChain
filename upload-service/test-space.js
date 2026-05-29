import dotenv from "dotenv";
import { create } from "@storacha/client";

dotenv.config();

const targetDid = process.env.STORACHA_SPACE_DID;
const email = process.env.STORACHA_EMAIL;

const client = await create();
console.log("Agent:", client.agent.did());

const account = await client.login(email);
await account.plan.wait();

const claimResult = await client.capability.access.claim();
if (claimResult.error) {
  console.warn("Claim warning:", claimResult.error.message);
} else {
  console.log("Claimed delegations:", claimResult.ok?.proofs?.length ?? 0);
}

console.log("\nSpaces after login:");
for (const space of client.spaces()) {
  console.log(`- ${space.did()} (${space.name || "unnamed"})`);
}

if (!targetDid) {
  console.error("Set STORACHA_SPACE_DID in .env");
  process.exit(1);
}

const found = client.spaces().some((s) => s.did() === targetDid);
console.log(`\nTarget space ${targetDid} known locally: ${found}`);

await client.setCurrentSpace(targetDid);
await account.provision(targetDid);

const file = new File(
  [JSON.stringify({ test: "coffeechain", at: new Date().toISOString() })],
  "coffeechain-test.json",
  { type: "application/json" }
);

try {
  const cid = await client.uploadFile(file);
  console.log("\nUpload OK!");
  console.log("CID:", cid.toString());
  console.log("URL: https://w3s.link/ipfs/" + cid.toString());
} catch (error) {
  console.error("\nUpload failed:", error.message);
  if (error.cause?.message) console.error("Cause:", error.cause.message);
  process.exit(1);
}
