package com.protector.app.engine;

import java.io.File;
import java.nio.file.Files;
import java.security.SecureRandom;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * Standalone encryptor for any binary (an .so, a model file, a data blob, a jar).
 *
 * Container: "PRTB1"(5) | salt(16) | iv(12) | AES-256-GCM(ciphertext+tag)
 * Key = PBKDF2WithHmacSHA256(password, salt, 200000, 256-bit).
 *
 * GCM means the file cannot be patched without the password, and a wrong password fails
 * cleanly. Runs on the JVM and on Android. For an .so you decrypt to app-private storage at
 * runtime and System.load() it (snippet in the README), so the plaintext .so never ships.
 */
public final class BinaryProtector {
    private static final byte[] MAGIC = {'P', 'R', 'T', 'B', '1'};
    private static final int SALT = 16, IV = 12, ITER = 200_000, KEYBITS = 256, TAGBITS = 128;
    private static final SecureRandom RNG = new SecureRandom();

    public static byte[] deriveKey(char[] password, byte[] salt) throws Exception {
        SecretKeyFactory f = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
        return f.generateSecret(new PBEKeySpec(password, salt, ITER, KEYBITS)).getEncoded();
    }

    public static byte[] encrypt(byte[] plain, char[] password) throws Exception {
        byte[] salt = new byte[SALT]; RNG.nextBytes(salt);
        byte[] iv = new byte[IV]; RNG.nextBytes(iv);
        byte[] key = deriveKey(password, salt);
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(TAGBITS, iv));
        byte[] ct = c.doFinal(plain);
        byte[] out = new byte[MAGIC.length + SALT + IV + ct.length];
        int p = 0;
        System.arraycopy(MAGIC, 0, out, p, MAGIC.length); p += MAGIC.length;
        System.arraycopy(salt, 0, out, p, SALT); p += SALT;
        System.arraycopy(iv, 0, out, p, IV); p += IV;
        System.arraycopy(ct, 0, out, p, ct.length);
        return out;
    }

    public static byte[] decrypt(byte[] blob, char[] password) throws Exception {
        if (blob.length < MAGIC.length + SALT + IV + 16
                || !Arrays.equals(Arrays.copyOfRange(blob, 0, MAGIC.length), MAGIC))
            throw new IllegalArgumentException("not a PRTB1 container");
        int p = MAGIC.length;
        byte[] salt = Arrays.copyOfRange(blob, p, p + SALT); p += SALT;
        byte[] iv = Arrays.copyOfRange(blob, p, p + IV); p += IV;
        byte[] key = deriveKey(password, salt);
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(TAGBITS, iv));
        return c.doFinal(blob, p, blob.length - p);
    }

    public static void encryptFile(File in, File out, char[] pw) throws Exception {
        Files.write(out.toPath(), encrypt(Files.readAllBytes(in.toPath()), pw));
    }

    public static void decryptFile(File in, File out, char[] pw) throws Exception {
        Files.write(out.toPath(), decrypt(Files.readAllBytes(in.toPath()), pw));
    }

    /** CLI: BinaryProtector enc|dec <in> <out> <password> */
    public static void main(String[] a) throws Exception {
        if (a.length < 4) { System.err.println("usage: enc|dec <in> <out> <password>"); System.exit(2); }
        File in = new File(a[1]), out = new File(a[2]);
        char[] pw = a[3].toCharArray();
        if (a[0].equals("enc")) { encryptFile(in, out, pw); System.out.println("encrypted -> " + out + " (" + out.length() + " B)"); }
        else if (a[0].equals("dec")) { decryptFile(in, out, pw); System.out.println("decrypted -> " + out + " (" + out.length() + " B)"); }
        else { System.err.println("unknown op " + a[0]); System.exit(2); }
    }

    private BinaryProtector() {}
}
