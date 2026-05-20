# CoffeeChain Backend

## Quick Start

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

## Auth

- Login endpoint: `POST /api/login/`
- Demo credentials (password: `demo123`)
  - `admin`
  - `supplier1`, `supplier2`
  - `retailer1`, `retailer2`
  - `cooperative1`, `cooperative2`, `cooperative3`
  - `regulator1`

## API Endpoints

- `GET/POST /api/batches/`
- `GET/POST /api/transfers/`
- `POST /api/transfers/{id}/receive/`
- `POST /api/transfers/{id}/send_otp/`
- `POST /api/transfers/{id}/verify_otp/`
- `POST /api/transfers/{id}/upload_proof/`
- `GET /api/reports/audit/`

## Notes

- Storacha uploads are handled via the Node.js `upload-service` (see root folder).
- Polygon anchoring uses a placeholder hash. Replace `supply_chain/services/blockchain.py`
  when ready for mainnet.

## Polygon (Amoy) Setup

1. Install dependencies:

```bash
cd smart-contracts
npm install
```

2. Create `.env` in `smart-contracts/`:

```bash
RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your_private_key
```

3. Compile + deploy:

```bash
npm run compile
npm run deploy:amoy
```

4. Set Django `.env`:

```bash
POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
POLYGON_PRIVATE_KEY=your_private_key
POLYGON_CONTRACT_ADDRESS=0x...
```
