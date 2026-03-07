# AxiomVault
## Privacy-First Secure Messaging Architecture with AI Moderation

This project was built as a demonstration of advanced system design, cryptography, and microservice architecture.

---

## ⚠️ Copyright and Usage Warning

**© 2026 Vidit Pandey. All Rights Reserved.**

This repository and its contents are provided strictly for **portfolio viewing and demonstration purposes only**.

- **DO NOT** copy, clone, fork, or use this code for your own projects.
- **DO NOT** distribute or modify this codebase.
- No license is granted to any person or entity obtaining a copy of this software. You are not permitted to use, run, or study this software for personal or commercial gain.

If you are a recruiter or interviewer, you are welcome to read the source code to evaluate my technical skills. However, any other use is strictly prohibited.

---

## Technical Architecture (Read-Only Overview)

AxiomVault separates concerns strictly between layers to ensure zero-knowledge routing:
- **Node.js + WebSockets Server:** Handles routing, authentication (JWT), Key Escrow, and real-time event broadcasting. The server only routes ciphertext and encrypted session keys; it never processes or stores plaintext messages.
- **Python + FastAPI AI Service:** Evaluates user metadata through an Isolation Forest machine learning model to detect anomalies and flag bot/spam behavior without probing message content.
- **Data Layer:** MongoDB Atlas for persistence and encrypted key relationships; Redis Cloud for millisecond-latency socket session mapping and rate limiting.

### 🔐 Core Cryptography & Algorithms

AxiomVault relies on a hybrid encryption model executed entirely on the client side using the `WebCrypto` API.

1. **AES-256-GCM (Symmetric Encryption)**
   - Used for encrypting the actual message payloads. 
   - Provides both confidentiality and authenticated data integrity.
2. **RSA-OAEP-2048 (Asymmetric Encryption)**
   - Used for securely exchanging the AES session keys between users.
   - Public keys are shared via the server; Private keys never leave the user's device unencrypted.
3. **PBKDF2 (Key Derivation)**
   - Uses exactly 600,000 iterations (OWASP recommended) of SHA-256 to stretch the user's local input passphrase.
   - The resulting hash creates a robust AES key used to symmetrically lock the RSA Private Key before it is uploaded to the server (Key Escrow).

### ✨ System Features

*   **Zero-Knowledge Real-Time Chat:** Direct messages and group chats delivered with sub-second latency via `Socket.io` while remaining mathematically opaque to the server.
*   **Privacy-Preserving AI Moderation:** A custom FastAPI microservice running an `IsolationForest` (Scikit-Learn) anomaly detection model. It scores user behavior (message rates, IP changes) to detect malicious bot activity without sacrificing payload privacy.
*   **Encrypted Key Escrow:** Users can safely log into their accounts from new devices. Their RSA Private Key is stored on MongoDB, but heavily encrypted using a PBKDF2 derivative of a secret passphrase known only to them.
*   **Dynamic Trust Scoring System:** Real-time analysis penalizes suspicious accounts, applying automated rate limits (via Redis) to defend against DDoS or spam vectors.

*Note: Environment variables, database configurations, and cryptographic secrets have been intentionally omitted from this repository.*

---

## 🚀 Deployment Guide

For a detailed breakdown of how this application was deployed to Vercel and Render using a custom GoDaddy domain, please read the [DEPLOYMENT.md](./DEPLOYMENT.md) guide.
