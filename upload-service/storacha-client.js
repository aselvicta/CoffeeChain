/**
 * Storacha client bootstrap — follows https://docs.storacha.network/how-to/upload/
 *
 * Two supported modes (in order of preference):
 *
 * 1. Bring Your Own Delegations (recommended for backend services)
 *    STORACHA_KEY + STORACHA_PROOF from `storacha key create` + `storacha delegation create`
 *
 * 2. Email login (persistent Node environment)
 *    STORACHA_EMAIL + STORACHA_SPACE_DID
 *    login() claims delegations; access.claim() syncs spaces created in the console
 */
import { create } from "@storacha/client";
import * as Proof from "@storacha/client/proof";
import { Signer } from "@storacha/client/principal/ed25519";

/** Accept multibase (M...) or comma-separated byte export from keygen. */
export function normalizeStorachaKey(key) {
  const trimmed = (key || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("M")) return trimmed;
  if (trimmed.includes(",")) {
    const bytes = Uint8Array.from(
      trimmed.split(",").map((part) => {
        const n = Number(part.trim());
        if (!Number.isInteger(n) || n < 0 || n > 255) {
          throw new Error(`Invalid STORACHA_KEY byte: ${part}`);
        }
        return n;
      })
    );
    return `M${Buffer.from(bytes).toString("base64")}`;
  }
  return trimmed;
}

export function parseSigner(key) {
  return Signer.parse(normalizeStorachaKey(key));
}

function readKey() {
  return process.env.STORACHA_KEY || process.env.STORACHA_PRINCIPAL || "";
}

function readProof() {
  return process.env.STORACHA_PROOF || process.env.PROOF || "";
}

/** Mode 1: delegated agent — docs "Bring Your Own Delegations" */
async function createDelegatedClient() {
  const key = readKey();
  const proofBase64 = readProof();
  if (!key || !proofBase64) return null;

  const principal = parseSigner(key);
  const client = await create({ principal });
  const proof = await Proof.parse(proofBase64);
  const space = await client.addSpace(proof);
  await client.setCurrentSpace(space.did());

  console.log(`Storacha: delegated agent ${client.agent.did()}`);
  console.log(`Storacha: space ${space.did()}`);
  return { client, spaceDid: space.did(), mode: "delegation" };
}

/** Mode 2: email login — docs "Claim Delegations via Email Validation" */
async function createEmailClient() {
  const email = process.env.STORACHA_EMAIL;
  const spaceDid = (process.env.STORACHA_SPACE_DID || "").trim();

  if (!email) {
    throw new Error("Set STORACHA_EMAIL in upload-service/.env");
  }
  if (!spaceDid) {
    throw new Error(
      "Set STORACHA_SPACE_DID in upload-service/.env (from `storacha space ls` or the console)"
    );
  }

  const client = await create();
  console.log(`Storacha: agent ${client.agent.did()}`);

  const account = await client.login(email);
  await account.plan.wait();

  // Sync spaces created in console; login alone may not pull the latest list
  const claim = await client.capability.access.claim();
  if (claim.error) {
    console.warn("Storacha claim warning:", claim.error.message);
  }

  const known = client.spaces().some((s) => s.did() === spaceDid);
  if (!known) {
    throw new Error(
      `Space ${spaceDid} is not delegated to this agent. Run:\n` +
        `  npx @storacha/cli login ${email}\n` +
        `  npx @storacha/cli space ls\n` +
        `  npx @storacha/cli space use ${spaceDid}`
    );
  }

  await client.setCurrentSpace(spaceDid);
  console.log(`Storacha: using space ${spaceDid}`);

  return { client, spaceDid, mode: "email" };
}

export async function createStorachaClient() {
  const key = readKey();
  const proof = readProof();

  if (key && !proof) {
    throw new Error(
      "STORACHA_PROOF is missing. After `storacha key create`, run:\n" +
        "  storacha space use <YOUR_SPACE_DID>\n" +
        "  storacha delegation create <AGENT_DID> " +
        "--can space/blob/add --can space/index/add --can filecoin/offer --can upload/add --base64\n" +
        "Then paste the output into STORACHA_PROOF in .env"
    );
  }

  const delegated = await createDelegatedClient();
  if (delegated) return delegated;

  return createEmailClient();
}

export async function verifyUploadReady(client) {
  const space = client.currentSpace();
  if (!space) {
    throw new Error("No active Storacha space — call setCurrentSpace() first.");
  }
  return space.did();
}

export async function uploadFile(client, file) {
  const cid = await client.uploadFile(file);
  return cid.toString();
}
