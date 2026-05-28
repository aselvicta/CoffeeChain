# Storacha Upload Service

Follows [How to Upload Data Using Storacha](https://docs.storacha.network/how-to/upload/).

CoffeeChain's Django backend posts files to `POST http://localhost:3001/upload`, which stores them on IPFS via Storacha.

## Quick start (CLI — easiest to verify)

```bash
npm install -g @storacha/cli

storacha login victaasel@gmail.com          # click email link, select plan
storacha space ls
storacha space use did:key:YOUR_SPACE_DID
storacha up ./test-upload.txt               # should print a bafy... CID
```

Use the same `STORACHA_SPACE_DID` in `.env`.

## Backend setup (Bring Your Own Delegations — recommended)

From the docs, for server/backend environments:

```bash
cd upload-service
npm install
cp .env.example .env
# set STORACHA_EMAIL and STORACHA_SPACE_DID

npm run keygen
# prints STORACHA_KEY and agent DID

npx @storacha/cli login YOUR_EMAIL
npx @storacha/cli space use did:key:YOUR_SPACE_DID

npx @storacha/cli delegation create did:key:YOUR_AGENT_DID \
  --can space/blob/add --can space/index/add \
  --can filecoin/offer --can upload/add --base64
```

Paste into `.env`:

```env
STORACHA_KEY=Mg...
STORACHA_PROOF=mAY...
```

Then:

```bash
npm run setup    # test upload
npm run dev      # start service on :3001
```

## Alternative: email login (persistent Node)

```env
STORACHA_EMAIL=you@example.com
STORACHA_SPACE_DID=did:key:...
```

First run sends an email link (once per agent). Spaces created in [console.storacha.network](https://console.storacha.network) sync via `access.claim()` on startup.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Agent DID + active space |
| POST | `/upload` | `multipart/form-data` field `file` → `{ success, cid, url }` |

## Troubleshooting

| Error | Fix |
|-------|-----|
| `space/blob/add capability is currently disabled` | Confirm Starter plan + payment method at [console.storacha.network](https://console.storacha.network) |
| `Agent has no proofs for did:key:...` | Run `storacha login` then `storacha space use <did>` |
| `Space not found` | Space not linked to this agent — use delegation mode or re-login |
