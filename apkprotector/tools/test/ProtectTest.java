package com.protector.test;

import com.protector.app.engine.ApkProtector;
import com.protector.app.engine.Signing;

import java.io.File;
import java.io.FileInputStream;
import java.nio.file.Files;

/** JVM harness: run the whole protection pipeline on a real APK, no Android device needed. */
public class ProtectTest {
    public static void main(String[] args) throws Exception {
        File inApk = new File(args[0]);
        File outApk = new File(args[1]);
        File keystore = new File(args[2]);
        File shellDex = new File(args[3]);
        File work = new File(args[4]);
        work.mkdirs();

        Signing.KeyMaterial km;
        try (FileInputStream fis = new FileInputStream(keystore)) {
            km = Signing.loadPkcs12(fis, "protector".toCharArray(), "protector", "protector".toCharArray());
        }
        byte[] shell = Files.readAllBytes(shellDex.toPath());
        byte[] decoy = args.length > 5 ? Files.readAllBytes(new File(args[5]).toPath()) : null;

        ApkProtector.Options opts = new ApkProtector.Options();
        opts.encryptNativeLibs = true;
        opts.antiDebug = true;
        opts.antiFrida = true;
        opts.antiTamper = true;
        opts.minSdk = 26;

        ApkProtector protector = new ApkProtector(opts, km, shell, decoy);
        ApkProtector.Report r = protector.protect(inApk, outApk, work,
                (msg, pct) -> System.out.println("  [" + pct + "%] " + msg));

        System.out.println("\n=== REPORT ===");
        System.out.println("package           : " + r.packageName);
        System.out.println("original app class: " + r.originalAppClass);
        System.out.println("DEX encrypted     : " + r.dexEncrypted);
        System.out.println("native libs enc   : " + r.nativeLibsEncrypted);
        System.out.println("decoys injected   : " + r.decoysInjected);
        System.out.println("signer cert sha256: " + r.signerCertSha256);
        System.out.println("input size        : " + r.inputSize);
        System.out.println("output size       : " + r.outputSize);
        for (String l : r.log) System.out.println("log: " + l);
    }
}
