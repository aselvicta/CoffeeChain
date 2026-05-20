import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import { create } from "@storacha/client";

dotenv.config();

const app = express();
const upload = multer();

const client = await create();

if (!process.env.STORACHA_EMAIL) {
  throw new Error("STORACHA_EMAIL must be set.");
}

const spaceName = process.env.STORACHA_SPACE_NAME || "COFFEECHAIN";
const spaceDid = process.env.STORACHA_SPACE_DID;

const account = await client.login(process.env.STORACHA_EMAIL);
await account.plan.wait();

if (spaceDid) {
  await client.setCurrentSpace(spaceDid);
  console.log(`Using Storacha space DID: ${spaceDid}`);
} else {
  const space = await client.createSpace(spaceName, { account });
  await client.setCurrentSpace(space.did());
  console.log(`Created Storacha space DID: ${space.did()}`);
}

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "file is required" });
    }
    const file = new File([req.file.buffer], req.file.originalname, {
      type: req.file.mimetype,
    });
    const cid = await client.uploadFile(file);
    return res.json({ success: true, cid: cid.toString() });
  } catch (error) {
    return res.status(500).json({ error: error.message || "upload failed" });
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log(`Storacha upload service running on port ${process.env.PORT || 3001}`);
});
