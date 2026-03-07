/**
 * WebCrypto API Wrapper for End-to-End Encryption
 * Follows the System Design: AES-256-GCM for messages, RSA-OAEP for keys, PBKDF2 for password hashing.
 */

// 1. Generate RSA-OAEP Key Pair (2048-bit)
export const generateRSAKeyPair = async () => {
    return await window.crypto.subtle.generateKey(
        {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256'
        },
        true, // exportable
        ['encrypt', 'decrypt']
    );
};

// 2. Derive AES Key from Passphrase (PBKDF2)
export const deriveKeyFromPassphrase = async (passphrase, salt = null) => {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );

    // If no salt provided, use a hardcoded one for simplicity, though unique salts are better in production.
    // The design mentions encrypt/decrypting the private key with the passphrase, so salt needs to be consistent, or stored.
    // For MVp, we'll use a static salt or derive it from the username. Let's use a static string for now to avoid needing extra DB fields.
    const saltBuffer = salt ? typeof salt === 'string' ? encoder.encode(salt) : salt : encoder.encode('GlobalStaticSaltForMVP_123');

    return await window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltBuffer,
            iterations: 600000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
};

// 3. Export Keys to Base64 (for DB Storage)
export const exportPublicKey = async (publicKey) => {
    const exported = await window.crypto.subtle.exportKey('spki', publicKey);
    return bufferToBase64(exported);
};

const exportPrivateKeyPKCS8 = async (privateKey) => {
    return await window.crypto.subtle.exportKey('pkcs8', privateKey);
};

export const importPublicKey = async (base64Key) => {
    const binaryDer = base64ToBuffer(base64Key);
    return await window.crypto.subtle.importKey(
        'spki',
        binaryDer,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt']
    );
};

// 4. Encrypt/Decrypt the RSA Private Key with the PBKDF2 AES Key
export const encryptPrivateKey = async (privateKey, aesKey) => {
    const exportedPrivateKey = await exportPrivateKeyPKCS8(privateKey);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedData = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        exportedPrivateKey
    );

    // Combine IV + Encrypted Data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);

    return bufferToBase64(combined.buffer);
};

export const decryptPrivateKey = async (encryptedBase64, aesKey) => {
    try {
        const combined = new Uint8Array(base64ToBuffer(encryptedBase64));
        const iv = combined.slice(0, 12);
        const data = combined.slice(12);

        const decryptedPKCS8 = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            aesKey,
            data
        );

        return await window.crypto.subtle.importKey(
            'pkcs8',
            decryptedPKCS8,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            true, // Must be true so we can export it to JWK for sessionStorage
            ['decrypt']
        );
    } catch (error) {
        console.error("Failed to decrypt private key. Incorrect passphrase?");
        throw new Error("Invalid Passphrase");
    }
};

// 5. Message Encryption/Decryption

// Generate a random AES-256-GCM key for encrypting a specific message
export const generateMessageKey = async () => {
    return await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
};

// Encrypt plaintext with AES Message Key
// Returns { ciphertextBase64, ivBase64 }
export const encryptPayload = async (plaintext, messageKey) => {
    const encoder = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        messageKey,
        encoder.encode(plaintext)
    );

    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return bufferToBase64(combined.buffer);
};

// Decrypt ciphertext with AES Message Key
export const decryptPayload = async (ciphertextBase64, messageKey) => {
    const combined = new Uint8Array(base64ToBuffer(ciphertextBase64));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        messageKey,
        data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
};

// Encrypt the AES Message Key with the Receiver's RSA Public Key
export const wrapMessageKey = async (messageKey, receiverPublicKey) => {
    // Export AES key to raw format first
    const rawKey = await window.crypto.subtle.exportKey('raw', messageKey);

    // Encrypt the raw AES key with RSA
    const encryptedKey = await window.crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        receiverPublicKey,
        rawKey
    );

    return bufferToBase64(encryptedKey);
};

// Decrypt the AES Message Key with our RSA Private Key
export const unwrapMessageKey = async (encryptedKeyBase64, myPrivateKey) => {
    const encryptedRaw = base64ToBuffer(encryptedKeyBase64);

    const decryptedRaw = await window.crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        myPrivateKey,
        encryptedRaw
    );

    // Import back into an AES Key object
    return await window.crypto.subtle.importKey(
        'raw',
        decryptedRaw,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
    );
};

// Utility: ArrayBuffer <-> Base64
// Standard base64 functions can't handle raw ArrayBuffers easily, so we use Uint8Array conversions
function bufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToBuffer(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

// ============================================================================
// JWK PERSISTENCE FOR SESSION RECOVERY
// ============================================================================

export async function exportPrivateKeyJWK(privateKey) {
    const jwk = await window.crypto.subtle.exportKey("jwk", privateKey);
    return jwk;
}

export async function importPrivateKeyJWK(jwk) {
    return await window.crypto.subtle.importKey(
        "jwk",
        jwk,
        {
            name: "RSA-OAEP",
            hash: "SHA-256",
        },
        true, // extractable
        ["decrypt"] // Matches original key_ops
    );
}
