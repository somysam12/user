package com.protector.shell;

import java.security.MessageDigest;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * AES-256-GCM container shared byte-for-byte with the desktop/on-device engine.
 *
 * Wire format for every encrypted blob: [12-byte random IV][ciphertext + 16-byte GCM tag].
 * GCM gives us confidentiality AND integrity: a flipped byte anywhere fails decryption,
 * so an attacker cannot patch the encrypted payload in place.
 */
final class Crypto {
    static final int IV_LEN = 12;
    static final int TAG_BITS = 128;

    static byte[] sha256(byte[]... parts) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            for (byte[] p : parts) if (p != null) md.update(p);
            return md.digest();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    static byte[] decrypt(byte[] key, byte[] blob) throws Exception {
        if (blob == null || blob.length < IV_LEN + 16) throw new IllegalArgumentException("short blob");
        byte[] iv = new byte[IV_LEN];
        System.arraycopy(blob, 0, iv, 0, IV_LEN);
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(TAG_BITS, iv));
        return c.doFinal(blob, IV_LEN, blob.length - IV_LEN);
    }

    private Crypto() {}
}
