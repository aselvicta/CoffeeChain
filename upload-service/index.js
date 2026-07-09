import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import { createStorachaClient, uploadFile, verifyUploadReady } from "./storacha-client.js";
import { isStorachaDisabledError, storeLocalFallback } from "./local-storage.js";

dotenv.config();

const app = express();
const upload = multer();

let client;
let activeSpaceDid;
let initMode = "unknown";
let storachaUploadOk = null; // null = untested, true/false after first upload

try {
  const initialized = await createStorachaClient();
  client = initialized.client;
  activeSpaceDid = initialized.spaceDid;
  initMode = initialized.mode;
  await verifyUploadReady(client);
  console.log(`Storacha ready. Active space: ${activeSpaceDid}`);
  console.log(`AGENT: ${client.agent.did()}`);
} catch (error) {
  console.error("Storacha init failed:", error.message);
  console.error(
    "Service will start in degraded mode (local fallback only). " +
      "Fix: npm run setup or add STORACHA_KEY + STORACHA_PROOF"
  );
}

app.get("/health", async (_req, res) => {
  // Always 200 when the process is up — Render uses this for deploy health checks.
  if (!client) {
    return res.json({
      ok: true,
      storacha: false,
      error: "Storacha client not initialized",
      fallback: "local",
    });
  }
  try {
    const spaceDid = await verifyUploadReady(client);
    return res.json({
      ok: true,
      storacha: true,
      space: spaceDid,
      agent: client.agent.did(),
      mode: initMode,
      storacha_upload: storachaUploadOk,
      fallback_available: true,
    });
  } catch (error) {
    return res.json({
      ok: true,
      storacha: false,
      error: error.message,
      agent: client.agent.did(),
      fallback: "local",
    });
  }
});

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "file is required" });
  }

  console.log(
    `[upload] file=${req.file.originalname} size=${req.file.size} type=${req.file.mimetype}`
  );
  if (client) {
    console.log("SPACE:", activeSpaceDid);
    console.log("AGENT:", client.agent.did());
  }

  // Try Storacha when client is available
  if (client) {
    try {
      await verifyUploadReady(client);
      const file = new File([req.file.buffer], req.file.originalname, {
        type: req.file.mimetype || "application/octet-stream",
      });
      const cidString = await uploadFile(client, file);
      storachaUploadOk = true;
      console.log(`[upload] Storacha OK cid=${cidString}`);
      return res.json({
        success: true,
        cid: cidString,
        url: `https://w3s.link/ipfs/${cidString}`,
        storage: "storacha",
        storacha_ok: true,
      });
    } catch (error) {
      console.error("[upload] Storacha error:", error.message);
      if (error.cause?.message) {
        console.error("[upload] cause:", error.cause.message);
      }

      if (!isStorachaDisabledError(error)) {
        return res.status(500).json({
          error: error.message || "upload failed",
          space: activeSpaceDid,
          agent: client.agent.did(),
        });
      }
      storachaUploadOk = false;
      console.warn(
        "[upload] Storacha space/blob/add disabled — using local fallback. " +
          "Not a CoffeeChain bug; fix account at console.storacha.network"
      );
    }
  }

  // Local fallback (FYP/demo keeps working)
  const local = storeLocalFallback(req.file.buffer, req.file.originalname);
  console.log(`[upload] local fallback cid=${local.cid} path=${local.path}`);
  return res.json({
    success: true,
    cid: local.cid,
    url: local.url,
    storage: local.storage,
    storacha_ok: false,
    note:
      "Storacha upload unavailable; receipt saved locally. Polygon anchoring still works.",
  });
});

const port = Number(process.env.PORT) || 3001;

const server = app.listen(port, () => {
  console.log(`Upload service on http://localhost:${port}`);
  console.log(`Health: http://localhost:${port}/health`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. Stop the other process:\n` +
        `  netstat -ano | findstr :${port}\n` +
        `  taskkill /PID <pid> /F`
    );
    process.exit(1);
  }
  throw err;
});
