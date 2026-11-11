package com.protector.app.engine;

import java.security.MessageDigest;
import java.security.SecureRandom;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * AES-256-GCM container. Wire format: [12-byte IV][ciphertext + 16-byte tag].
 * Pure Java (no Android imports) so the whole engine is JVM-unit-testable.
 * Must stay identical to com.protector.shell.Crypto.
 */
public final class Crypto {
    public static final int IV_LEN = 12;
    public static final int TAG_BITS = 128;
    private static final SecureRandom RNG = new SecureRandom();

    public static byte[] randomKey() {
        byte[] k = new byte[32]; // AES-256
        RNG.nextBytes(k);
        return k;
    }

    public static byte[] sha256(byte[]... parts) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            for (byte[] p : parts) if (p != null) md.update(p);
            return md.digest();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static byte[] encrypt(byte[] key, byte[] plain) {
        try {
            byte[] iv = new byte[IV_LEN];
            RNG.nextBytes(iv);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(TAG_BITS, iv));
            byte[] ct = c.doFinal(plain);
            byte[] out = new byte[IV_LEN + ct.length];
            System.arraycopy(iv, 0, out, 0, IV_LEN);
            System.arraycopy(ct, 0, out, IV_LEN, ct.length);
            return out;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static byte[] decrypt(byte[] key, byte[] blob) {
        try {
            byte[] iv = new byte[IV_LEN];
            System.arraycopy(blob, 0, iv, 0, IV_LEN);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(TAG_BITS, iv));
            return c.doFinal(blob, IV_LEN, blob.length - IV_LEN);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private Crypto() {}
}
