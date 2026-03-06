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

AxiomVault separates concerns strictly between layers:
- **Node.js + WebSockets Server:** Handles routing, authentication (JWT), Key Escrow, and real-time event broadcasting. The server only routes ciphertext and encrypted session keys; it never processes plaintext messages.
- **Python + FastAPI AI Service:** Evaluates user metadata through an Isolation Forest machine learning model to detect anomalies and flag bot/spam behavior without probing message content.
- **Data Layer:** MongoDB Atlas for persistence and encrypted key relationships; Redis Cloud for millisecond-latency socket session mapping and rate limiting.

*Note: Environment variables, database configurations, and cryptographic secrets have been intentionally omitted from this repository.*
