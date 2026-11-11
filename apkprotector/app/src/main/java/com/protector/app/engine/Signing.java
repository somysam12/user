package com.protector.app.engine;

import com.android.apksig.ApkSigner;

import java.io.File;
import java.io.InputStream;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;

/**
 * Key material + APK Signature Scheme v1/v2/v3 signing, using Google's pure-Java apksig.
 * Runs identically on the JVM (tests) and on Android (the Protector app).
 */
public final class Signing {

    public static final class KeyMaterial {
        public final PrivateKey privateKey;
        public final List<X509Certificate> certs;
        public final byte[] certSha256;   // SHA-256 of the leaf signing cert (DER)
        KeyMaterial(PrivateKey pk, List<X509Certificate> certs, byte[] sha) {
            this.privateKey = pk; this.certs = certs; this.certSha256 = sha;
        }
    }

    /**
     * Load a user keystore of the given type. On Android only "PKCS12" (and "BKS" where present)
     * work — ".jks" has no provider on Android, so convert it first:
     *   keytool -importkeystore -srckeystore my.jks -destkeystore my.p12 -deststoretype PKCS12
     * Tries the requested type, then falls back to PKCS12/BKS so a mis-typed keystore still loads.
     */
    public static KeyMaterial loadKeystore(InputStream in, byte[] raw, String type,
                                           char[] storePass, String alias, char[] keyPass)
            throws Exception {
        String[] order = type != null
                ? new String[]{type, "PKCS12", "BKS", "JKS"}
                : new String[]{"PKCS12", "BKS", "JKS"};
        Exception last = null;
        for (String t : order) {
            try {
                KeyStore ks = KeyStore.getInstance(t);
                ks.load(new java.io.ByteArrayInputStream(raw), storePass);
                return fromKeyStore(ks, alias, keyPass);
            } catch (Exception e) {
                last = e;
            }
        }
        throw new Exception("Could not load keystore (tried PKCS12/BKS/JKS). "
                + "On Android, convert .jks to .p12. Cause: " + (last != null ? last.getMessage() : "?"));
    }

    private static KeyMaterial fromKeyStore(KeyStore ks, String alias, char[] keyPass) throws Exception {
        if (alias == null || alias.isEmpty()) {
            Enumeration<String> aliases = ks.aliases();
            while (aliases.hasMoreElements()) {
                String a = aliases.nextElement();
                if (ks.isKeyEntry(a)) { alias = a; break; }
            }
        }
        PrivateKey pk = (PrivateKey) ks.getKey(alias, keyPass);
        if (pk == null) throw new Exception("No private key for alias '" + alias + "' (wrong alias or key password?)");
        Certificate[] chain = ks.getCertificateChain(alias);
        List<X509Certificate> certs = new ArrayList<>();
        for (Certificate c : chain) certs.add((X509Certificate) c);
        byte[] der = certs.get(0).getEncoded();
        byte[] sha = MessageDigest.getInstance("SHA-256").digest(der);
        return new KeyMaterial(pk, certs, sha);
    }

    /** Load a PKCS12 keystore and build the key material + signer-cert hash used for key binding. */
    public static KeyMaterial loadPkcs12(InputStream p12, char[] storePass, String alias, char[] keyPass)
            throws Exception {
        KeyStore ks = KeyStore.getInstance("PKCS12");
        ks.load(p12, storePass);
        if (alias == null) {
            Enumeration<String> aliases = ks.aliases();
            if (aliases.hasMoreElements()) alias = aliases.nextElement();
        }
        PrivateKey pk = (PrivateKey) ks.getKey(alias, keyPass);
        Certificate[] chain = ks.getCertificateChain(alias);
        List<X509Certificate> certs = new ArrayList<>();
        for (Certificate c : chain) certs.add((X509Certificate) c);

        byte[] der = certs.get(0).getEncoded();
        byte[] sha = MessageDigest.getInstance("SHA-256").digest(der);
        return new KeyMaterial(pk, certs, sha);
    }

    /** Sign {@code in} into {@code out} with v1+v2+v3. apksig also 4-byte aligns the archive. */
    public static void sign(File in, File out, KeyMaterial km, int minSdk) throws Exception {
        ApkSigner.SignerConfig cfg = new ApkSigner.SignerConfig.Builder(
                "CERT", km.privateKey, km.certs).build();
        ApkSigner signer = new ApkSigner.Builder(Collections.singletonList(cfg))
                .setInputApk(in)
                .setOutputApk(out)
                .setMinSdkVersion(minSdk)
                .setV1SigningEnabled(true)
                .setV2SigningEnabled(true)
                .setV3SigningEnabled(true)
                .build();
        signer.sign();
    }

    private Signing() {}
}
