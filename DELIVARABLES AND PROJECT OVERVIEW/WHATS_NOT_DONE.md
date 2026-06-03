# What's Not Done Yet

This file captures the parts of CoffeeChain that are still incomplete, stubbed, or dependent on demo fallbacks.

## Role / UX Gaps
- No dedicated Farmer login role or farmer dashboard exists yet.
- Farmers are stored as records and verified by Ministry ID, but they do not authenticate as system users.
- There is no separate end-user mobile flow for farmers to view deliveries or OTP status.

## External Integrations Not Fully Live
- The Ministry of Agriculture lookup still reads from a local CSV file instead of a live government API.
- SMS delivery is simulated by default; real delivery depends on configuring a provider such as Africa's Talking or Twilio.
- Storacha/IPFS upload is not guaranteed to be live; the system falls back to local receipt storage under `media/receipts/` when upload fails.
- Polygon anchoring is available in code, but it still depends on external RPC, private key, and contract configuration.

## Backend / Workflow Gaps
- Blockchain anchoring is not treated as a hard requirement, so OTP verification can complete even if anchoring fails.
- Some transfer and verification flows are still driven by demo data and smoke-test assumptions rather than a fully integrated production workflow.
- There is no automated reconciliation engine that continuously validates stock balances across supplier, warehouse, branch, and farmer records.

## Reporting / Governance Gaps
- Audit and report endpoints exist, but the platform does not yet provide a full compliance dashboard with exports, filters, and long-term analytics.
- There is no documented approval workflow for every administrative action beyond the current audit logging.

## Deployment / Operations Gaps
- Production deployment settings, secrets management, and CI/CD are not fully documented here.
- Environment variables for SMS, Storacha, and Polygon still need to be set manually for live integrations.
- The project still relies on local demo seeding for the main walkthroughs.

## Frontend Gaps
- Some frontend views are still demo-oriented and rely on static/sample data instead of only live backend data.
- The public/farmer-facing experience is incomplete compared to the internal role dashboards.

## In Short
The core supplier, branch, transfer, OTP, proof upload, and audit flows are demonstrable, but the project is still missing a true farmer-facing role, a live Ministry API integration, guaranteed live SMS/IPFS/blockchain integrations, and a fuller production governance/reporting stack.
