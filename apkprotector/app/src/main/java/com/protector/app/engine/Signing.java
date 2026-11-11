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
