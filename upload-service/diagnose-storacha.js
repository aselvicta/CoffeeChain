import dotenv from "dotenv";
import { create } from "@storacha/client";

dotenv.config();

const email = process.env.STORACHA_EMAIL;
if (!email) {
  console.error("Set STORACHA_EMAIL");
  process.exit(1);
}

const client = await create();
console.log("Agent DID:", client.agent.did());

const account = await client.login(email);
console.log("Account DID:", account.did());

const plan = await account.plan.get();
console.log("\nPlan status:");
console.log(JSON.stringify(plan, null, 2));

try {
  const session = await account.plan.createAdminSession(
    account.did(),
    "http://localhost:3001/health"
  );
  console.log("\nBilling console URL (open if uploads fail):");
  console.log(session.ok?.url || session);
} catch (error) {
  console.log("\nCould not create admin session:", error.message);
}

console.log("\nSpaces:");
for (const space of client.spaces()) {
  console.log(`- ${space.did()} (${space.name || "unnamed"})`);
}
