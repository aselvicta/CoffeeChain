# Chapter Three: Actors and Use Cases

## 3.1 Introduction

This chapter identifies the actors that interact with CoffeeChain and outlines the principal use cases assigned to each actor. It also indicates whether each use case has been implemented, partially implemented, or remains outstanding.

## 3.2 Actors

The principal actors in the system are as follows:

- Supplier;
- Cooperative / Branch;
- Retailer;
- Farmer;
- Admin;
- Enterprise Customer (Tenant);
- Operator / DevOps.

## 3.3 Actor-Specific Use Cases

### 3.3.1 Supplier

- Create fertilizer batch - already implemented.
- Dispatch batch to warehouse or branch - already implemented.
- View supplier dashboard - partially implemented.

### 3.3.2 Cooperative / Branch

- Register farmer from a directory - partially implemented.
- Receive dispatched batch - already implemented.
- Allocate fertilizer to farmers - already implemented.
- Generate cooperative reports - partially implemented.

### 3.3.3 Retailer

- Receive batches and sell to farmers - partially implemented.

### 3.3.4 Farmer

- Receive fertilizer and confirm via OTP - already implemented.
- Upload delivery proof - already implemented.

### 3.3.5 Admin

- Create users and assign roles - already implemented.
- View audit logs and system reports - already implemented at a basic level.
- Manage tenants and billing - not yet implemented.

### 3.3.6 Enterprise Customer (Tenant)

- Onboard an organisation as a tenant - not yet implemented.
- Configure notification preferences and export audits - partially implemented.

### 3.3.7 Operator / DevOps

- Monitor anchoring and upload failures - partially implemented.
- Reconcile pending local receipts and retry uploads - not yet implemented.

## 3.4 Cross-Cutting Use Cases

The following use cases cut across multiple actors and are important for the end-to-end operation of the platform:

- trace a batch from creation to verification - partially implemented;
- export audit reports by date range and tenant - not yet implemented;
- bulk import batches, farmers, or warehouses - not yet implemented;
- enforce multi-tenant isolation and billing - not yet implemented.

## 3.5 Implementation Status Summary

### 3.5.1 Already Implemented

- batch creation and warehouse management;
- transfer creation and receipt confirmation;
- OTP send and verify;
- proof upload;
- receipt storage with fallback;
- blockchain anchoring integration;
- audit logging;
- basic dashboards and workflow screens.

### 3.5.2 Partially Implemented

- farmer directory integration;
- supplier and branch dashboards;
- cooperative reporting;
- traceability UI;
- notification enhancements;
- anchoring monitoring.

### 3.5.3 Not Yet Implemented

- tenant model and onboarding;
- billing and usage metering;
- tenant-scoped exports;
- background retry jobs;
- partner registry connectors;
- advanced monitoring and alerts;
- tenant-specific UI controls.

## 3.6 Summary

The current implementation covers the main operational use cases required for fertilizer tracking. The remaining work is concentrated around tenant support, integration flexibility, reporting, resilience, and production readiness.
