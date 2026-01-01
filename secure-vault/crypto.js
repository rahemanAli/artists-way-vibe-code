/**
 * Secure Vault Cryptography
 * Uses Web Crypto API for all operations.
 */

const ENC_ALGO = { name: 'AES-GCM', length: 256 };
const KDF_ALGO = { name: 'PBKDF2' };
const HASH_ALGO = 'SHA-256';
const ITERATIONS = 100000; // High iteration count for security

class CryptoVault {

    // Generate a secure random salt
    static generateSalt() {
        return window.crypto.getRandomValues(new Uint8Array(16));
    }

    // Generate a secure random IV
    static generateIV() {
        return window.crypto.getRandomValues(new Uint8Array(12));
    }

    // Convert string to buffer
    static str2buf(str) {
        return new TextEncoder().encode(str);
    }

    // Convert buffer to string
    static buf2str(buf) {
        return new TextDecoder().decode(buf);
    }

    // ArrayBuffer to Hex string
    static buf2hex(buffer) {
        return [...new Uint8Array(buffer)]
            .map(x => x.toString(16).padStart(2, '0'))
            .join('');
    }

    // Hex string to ArrayBuffer
    static hex2buf(hexString) {
        return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    }

    /**
     * Import password as a Key material
     */
    static async importPassword(password) {
        const rawKey = this.str2buf(password);
        return await window.crypto.subtle.importKey(
            'raw',
            rawKey,
            { name: 'PBKDF2' },
            false,
            ['deriveKey', 'deriveBits']
        );
    }

    /**
     * Derive an AES-GCM Key from password and salt
     */
    static async deriveKey(passwordKey, salt) {
        return await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: ITERATIONS,
                hash: HASH_ALGO
            },
            passwordKey,
            ENC_ALGO,
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypt data
     * Returns: { cipherText: HexString, iv: HexString, salt: HexString }
     */
    static async encryptData(text, password) {
        const salt = this.generateSalt();
        const iv = this.generateIV();

        const passwordKey = await this.importPassword(password);
        const aesKey = await this.deriveKey(passwordKey, salt);

        const data = this.str2buf(text);
        const encrypted = await window.crypto.subtle.encrypt(
            { ...ENC_ALGO, iv: iv },
            aesKey,
            data
        );

        return {
            cipherText: this.buf2hex(encrypted),
            iv: this.buf2hex(iv),
            salt: this.buf2hex(salt)
        };
    }

    /**
     * Decrypt data
     * Expects: { cipherText: HexString, iv: HexString, salt: HexString }
     */
    static async decryptData(encryptedObj, password) {
        const salt = this.hex2buf(encryptedObj.salt);
        const iv = this.hex2buf(encryptedObj.iv);
        const cipherText = this.hex2buf(encryptedObj.cipherText);

        const passwordKey = await this.importPassword(password);
        const aesKey = await this.deriveKey(passwordKey, salt);

        try {
            const decrypted = await window.crypto.subtle.decrypt(
                { ...ENC_ALGO, iv: iv },
                aesKey,
                cipherText
            );
            return this.buf2str(decrypted);
        } catch (e) {
            console.error(e);
            throw new Error('Decryption failed. Wrong password or corrupted data.');
        }
    }

    /**
     * Generate a hash of the password to verify correctness without storing the password
     * We use a STATIC salt for this verification hash only, or a stored salt.
     * Strategy: Store a hash of the password + random_salt in localStorage.
     * When logging in, verify hash(input + stored_salt) === stored_hash.
     */
    static async hashPasswordVerifier(password, salt) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + salt);
        // Simple SHA-256 of password+salt for verification (NOT for key derivation)
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return this.buf2hex(hashBuffer);
    }
}
