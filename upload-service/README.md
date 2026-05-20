# Storacha Upload Service

## Setup

```bash
cd upload-service
npm install
cp .env.example .env
# Set STORACHA_EMAIL and verify via email when prompted
npm run dev
```

## Endpoint

`POST /upload` with form-data `file` returns:

```json
{ "success": true, "cid": "bafy..." }
```
