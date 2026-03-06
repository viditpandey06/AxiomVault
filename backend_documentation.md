# Encrypted Chat App - Backend Codebase Documentation

This document provides a detailed breakdown of every component, file, and dependency used in the backend of the Encrypted Chat application.

## 1. Project Dependencies & Tools

The backend is composed of two main services: a Node.js `backend` and a Python `ai-service`.

### Node.js Backend (`backend/package.json`)
*   **`express`**: A minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications. Used to build our REST API endpoints.
*   **`mongoose`**: An elegant MongoDB object modeling tool designed to work in an asynchronous environment. It provides a straight-forward, schema-based solution to model your application data.
*   **`socket.io`**: Enables real-time, bidirectional, and event-based communication between the browser and the server. Used for chat messaging.
*   **`redis`**: A robust, performance-focused Redis client for Node.js. Used to store active socket sessions, handle rate limiting, and track online users.
*   **`bcrypt`**: A library to help you hash passwords. It adds salt to passwords and hashes them securely before storing them in the database.
*   **`jsonwebtoken`**: An implementation of JSON Web Tokens. Used to securely transmit information between parties as a JSON object, enabling stateless authentication.
*   **`cors`**: A package for providing a Connect/Express middleware that can be used to enable CORS (Cross-Origin Resource Sharing) with various options.
*   **`dotenv`**: A zero-dependency module that loads environment variables from a `.env` file into `process.env`.
*   **`nodemon` (dev-dependency)**: A utility that monitors for any changes in your source and automatically restarts your server.

### Python AI Service (`ai-service/requirements.txt`)
*   **`fastapi`**: A modern, fast (high-performance), web framework for building APIs with Python based on standard Python type hints.
*   **`uvicorn`**: An ASGI web server implementation for Python. Used to run the FastAPI application.
*   **`scikit-learn`**: A machine learning library for Python. We use it specifically for the `IsolationForest` algorithm for anomaly/spam detection.
*   **`pandas`**: A fast, powerful, flexible, and easy-to-use open-source data analysis and manipulation tool.
*   **`numpy`**: The fundamental package for scientific computing with Python.
*   **`pydantic`**: Data validation and settings management using python type annotations.

---

## 2. Directory Structure: `backend/`

### `src/index.js`
This is the main entry point of the Node.js application.
*   **Lines 1-6**: Import essential modules (`dotenv`, `express`, `http`, `cors`) and custom configurations (`connectDB`, `connectRedis`, routes).
*   **Lines 10-18**: Initialize the Express app, wrap it in an `http` server (required for Socket.io), and configure basic middlewares (CORS, JSON body parsing, REST routes).
*   **Lines 24-36**: Set up the `socket.io` server attached to the HTTP server, configured to accept cross-origin requests.
*   **Lines 38-48**: The `startServer` async function initializes the MongoDB connection, connects to the Redis client, starts the Socket.io handlers, and finally begins listening on the designated PORT (5000).

### `src/config/db.js`
*   Exports the `connectDB` function. It uses `mongoose.connect()` referencing the `MONGO_URI` from the `.env` file to establish a connection to MongoDB Atlas. If it fails, the process exits with status `1`.

### `src/config/redis.js`
*   Initializes the `redisClient` using the URL from `.env`.
*   Exports the client and a `connectRedis` helper function to ensure the connection is open before operations occur.

### `src/models/` (Data Layer)
*   **`User.js`**: Defines the user schema (`username`, `email`, `auth_provider`, `password_hash`, `oauth_id`). Crucially, it stores the user's `public_key` and AES-`encrypted_private_key`. It also tracks a `trust_score` used for rate limiting/banning by the AI service.
*   **`PrivateMessage.js`**: Defines direct messages. Stores `sender_id`, `receiver_id`, the `ciphertext` of the message, and the `encrypted_aes_key` (which is the session key encrypted by the receiver's public key). Includes an array for `reactions`.
*   **`Group.js`**: Defines a chat group, storing the `group_name`, `admin_id`, and a list of member object IDs.
*   **`GroupMessage.js`**: Defines messages sent within a group context. Stores `group_id`, `sender_id`, and `ciphertext`.
*   **`GroupKey.js`**: A junction table schema. Group communication uses a shared AES key. This collection stores that shared AES key for each member, encrypted with that specific member's RSA public key (`encrypted_group_key`).
*   **`MetadataLog.js`**: Stores raw behavioral data (e.g., `message_rate_per_min`, `reports_received`) for a specific user to be queried by the AI service later.

### `src/controllers/authController.js`
*   **`signup`**: Accepts user payload. Checks if the user already exists. If `auth_provider` is 'local', it hashes the password using `bcrypt`. Saves the user to DB ensuring the locked `encrypted_private_key` parameter is stored. Returns a JWT and user data.
*   **`login`**: Verifies user credentials based on the `auth_provider` (verifying bcrypt passwords for local auth). Generates a JWT upon success, returning the user object containing their encrypted vault (private key layer).
*   **`getMe`**: A simple endpoint returning the authenticated user's data payload.

### `src/middleware/auth.js`
*   An Express middleware that intercepts requests. It looks for the `Authorization: Bearer <token>` header, uses `jwt.verify()` against our `JWT_SECRET`, checks if the user exists in the database, and injects `req.user` into the request flow for downstream controllers.

### `src/middleware/rateLimiter.js`
*   A utility middleware returning an async function that uses Redis. It tracks requests per IP (`rate_limit:ip`), increments the counter in Redis, sets an expiration window, and rejects the request (`429 Too Many Requests`) if the limit is exceeded.

### `src/sockets/index.js`
The master WebSocket file.
*   **Lines 6-21**: Socket.io middleware that validates the provided JWT token on the socket handshake. If valid, attaches the user object to the specific socket instance.
*   **Lines 23-40**: On a successful connection, maps the `socket.id` to the `user_id` inside Redis (`user_socket:user_id`). Adds the user to an `online_users` Redis Set. Broadcasts `user_status` ('online') to other connections. Cleanly removes these on `disconnect`.
*   **Line 42-43**: Defines external routes by passing `io` and `socket` into the message and group socket handlers.

### `src/sockets/messageHandler.js`
*   **`send_private_message`**: Saves the incoming `ciphertext` and `encrypted_aes_key` to MongoDB as a `PrivateMessage`. Looks up the receiver's active socket ID from Redis (`user_socket:receiver_id`) and emits `receive_private_message` to them immediately if they are online.
*   **`send_reaction`**: Updates the MongoDB message document pushing the new reaction. Finds the socket of the *other* user in the conversation and emits `receive_reaction`.

### `src/sockets/groupHandler.js`
*   **`join_groups`**: Loops over all MongoDB Groups the connecting user is a part of and executes `socket.join(room_id)`, subscribing their active socket to group broadcasting rooms.
*   **`create_group`**: Validates members and an array of `encrypted_group_key` items (one per member). Saves the group to MongoDB, saves the keys, auto-joins the creator to the socket room, and emits `group_added` to online members so their UI can update.
*   **`send_group_message`**: Saves the `GroupMessage` payload to MongoDB and fires `io.to('group_room').emit()` to efficiently broadcast to all connected members.

### `src/services/aiService.js`
*   **`analyzeUserBehavior`**: Gathers a user's latest `MetadataLog` from DB. Issues an HTTP `POST` request (`fetch`) payload to the Python microservice. Upon receiving a response, it parses the `spam_score` and `is_anomaly`. If the score represents spammy behavior, it penalizes the user's `trust_score` and updates MongoDB.

---

## 3. Directory Structure: `ai-service/`

### `main.py`
This is the Python ML microservice.
*   **Lines 1-8**: Imports FastAPI, Pandas for DataFrame operations, IsolationForest from Scikit-Learn for ML, and Pydantic for request validation.
*   **Lines 12-21**: We seed a dummy `baseline_data` Pandas DataFrame containing examples of normal usage vs. spam bot usage. We initialize an `IsolationForest` model setting an expected anomaly rate (`contamination=0.1`) and `fit` it to the baseline data immediately on boot.
*   **Lines 23-28**: A Pydantic class validating incoming JSON requests to ensure types (user_id, rate_per_min, ip_changes, reports) are correct.
*   **Lines 30-54**: The `@app.post("/analyze")` endpoint. 
    1. It wraps the incoming payload into a Pandas DataFrame.
    2. Runs `model.predict()` (returns 1 for normal, -1 for anomaly).
    3. Runs `model.decision_function()` returning the raw margin score.
    4. Computes a sigmoid-style function mapping the decision function into a `0.0` to `1.0` `spam_score`.
    5. Applies hardcoded overrides (e.g., if highly reported or rate exceeding 60 msgs/min, force score high).
    6. Returns the analysis JSON to the Node.js server.
