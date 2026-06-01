# Chapter One: System Overview

## 1.1 Introduction

CoffeeChain has been repositioned from an exploratory prototype into a private B2B fertilizer tracking platform. The system now focuses on practical traceability, auditability, and operational control for suppliers, cooperatives, retailers, and enterprise customers.

## 1.2 System Direction

The project direction emphasises the following priorities:

- reliable end-to-end tracking of fertilizer batches;
- clear dispatch, receipt, and verification workflows;
- proof capture and blockchain anchoring for auditability;
- off-chain receipt storage with graceful fallback;
- enterprise-ready reporting and monitoring;
- private-sector onboarding rather than government integration.

## 1.3 Architecture Overview

The platform is composed of four major layers:

- a Django REST backend for business logic and persistence;
- a React frontend for workflow execution and dashboards;
- supporting services for IPFS/Storacha, OTP, SMS, and blockchain anchoring;
- a relational database for transactional and audit data.

## 1.4 Data and Governance Orientation

The current implementation uses role-based access control for supplier, cooperative, retailer, regulator, and admin users. Farmer directory lookup remains CSV-based for development, while the structure allows future partner- or customer-provided registry connectors.

Auditability is built into the platform through audit logging, notification records, and blockchain anchor metadata.

## 1.5 Implementation Summary

The system already includes the core workflow components needed for fertilizer tracking:

- user and role management;
- warehouse and batch management;
- dispatch and receipt workflows;
- proof upload;
- OTP verification;
- receipt storage;
- blockchain anchoring;
- notifications;
- audit logging.

## 1.6 Current Limitations

The following areas remain incomplete:

- tenant onboarding and multi-tenancy;
- billing and usage metering;
- pluggable registry connectors;
- reporting exports;
- retry and reconciliation jobs;
- infrastructure hardening and monitoring.

## 1.7 Summary

The revised direction makes CoffeeChain a private traceability and audit platform rather than a government-integration system. The core operational flows are in place, but the system still requires tenant support, reporting, operational hardening, and full release readiness.
