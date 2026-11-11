package com.protector.app.engine;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.TreeMap;
import java.util.zip.CRC32;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipOutputStream;

/**
 * The on-device protection pipeline — the "packer".
 *
 * Given an input APK it produces a protected APK in which:
 *   - classes.dex is the loader shell; every original DEX is AES-256-GCM encrypted in assets/prt/d
 *   - native .so (optional) are AES-256-GCM encrypted into assets/prt/n
 *   - AndroidManifest's <application android:name> is repointed to the shell's ProxyApplication
 *   - a config blob (assets/prt/c.bin) is encrypted under a key bound to the signing certificate
 *   - the old signature is dropped and the APK is re-signed (v1+v2+v3)
 *   - a PRIVATE PROPERTY notice is embedded
 */
public final class ApkProtector {

    public static final String PROXY_APP = "com.protector.shell.ProxyApplication";

    public static final class Options {
        public boolean encryptNativeLibs = true;
        public boolean antiDebug = true;
        public boolean antiFrida = true;
        public boolean antiEmulator = false; // off by default (false positives on some real devices)
        public boolean antiTamper = true;
        public boolean injectDecoys = true;
        public int minSdk = 26;
        public String ownerLabel = "PRIVATE PROPERTY";
        /** Lib filenames (e.g. "libfoo.so") to LEAVE UNENCRYPTED — keep whitelisted/loaded-early libs intact. */
        public java.util.Set<String> excludeLibs = new java.util.HashSet<>();
    }

    public static final class Report {
        public String packageName;
        public String originalAppClass;
        public int dexEncrypted;
        public int nativeLibsEncrypted;
        public boolean decoysInjected;
        public long inputSize;
        public long outputSize;
        public String signerCertSha256;
        public final List<String> log = new ArrayList<>();
    }

    public interface Progress { void step(String message, int percent); }

    private final Options opts;
    private final Signing.KeyMaterial key;
    private final byte[] shellDex;
    private final byte[] decoyDex;

    public ApkProtector(Options opts, Signing.KeyMaterial key, byte[] shellDex, byte[] decoyDex) {
        this.opts = opts;
        this.key = key;
        this.shellDex = shellDex;
        this.decoyDex = decoyDex;
    }

    public Report protect(File inApk, File outApk, File workDir, Progress p) throws Exception {
        Report r = new Report();
        r.inputSize = inApk.length();
        r.signerCertSha256 = hex(key.certSha256);
        if (p != null) p.step("Reading APK", 5);

        byte[] dexKey = Crypto.randomKey();
        File unsigned = new File(workDir, "unsigned.apk");

        // ordered original dex entries: classes.dex, classes2.dex, ...
        TreeMap<Integer, String> dexEntries = new TreeMap<>();
        List<String> soEntries = new ArrayList<>();

        try (ZipFile zip = new ZipFile(inApk)) {
            // ---- read + patch manifest first (need package name for the key binding) ----
            ZipEntry manifestEntry = zip.getEntry("AndroidManifest.xml");
            if (manifestEntry == null) throw new IllegalArgumentException("No AndroidManifest.xml — not an APK");
            byte[] manifestBytes = readAll(zip, manifestEntry);
            Axml axml = Axml.parse(manifestBytes);
            r.packageName = axml.getManifestPackage();
            if (r.packageName == null) throw new IllegalStateException("manifest has no package name");
            r.originalAppClass = axml.setApplicationName(PROXY_APP);
            byte[] patchedManifest = axml.build();
            r.log.add("package = " + r.packageName);
            r.log.add("original Application = " + (r.originalAppClass == null ? "(none)" : r.originalAppClass));
            if (p != null) p.step("Patched manifest", 15);

            // ---- classify entries ----
            java.util.Enumeration<? extends ZipEntry> e = zip.entries();
            while (e.hasMoreElements()) {
                ZipEntry ze = e.nextElement();
                String name = ze.getName();
                if (ze.isDirectory()) continue;
                if (name.matches("classes\\d*\\.dex")) {
                    int idx = name.equals("classes.dex") ? 1 : Integer.parseInt(name.substring(7, name.length() - 4));
                    dexEntries.put(idx, name);
                } else if (opts.encryptNativeLibs && name.startsWith("lib/") && name.endsWith(".so")) {
                    String fname = name.substring(name.lastIndexOf('/') + 1);
                    if (!opts.excludeLibs.contains(fname)) {
                        soEntries.add(name);          // encrypt this one
                    }                                  // excluded libs fall through and are copied as-is
                }
            }
            if (dexEntries.isEmpty()) throw new IllegalStateException("no classes.dex found");

            // ---- derive wrap key, build encrypted payloads, assemble zip ----
            byte[] wrapKey = PrtFormat.wrapKey(key.certSha256, r.packageName);

            try (ZipOutputStream out = new ZipOutputStream(new FileOutputStream(unsigned))) {

                // shell dex becomes the primary classes.dex
                putStored(out, "classes.dex", shellDex);

                // decoy bait as classes2.dex: believable fake classes/API calls for analysts/AI
                if (opts.injectDecoys && decoyDex != null && decoyDex.length > 0) {
                    putStored(out, "classes2.dex", decoyDex);
                    r.decoysInjected = true;
                }

                // encrypt original dexes -> assets/prt/d/<i>.bin
                int di = 0;
                for (String dexName : dexEntries.values()) {
                    byte[] dex = readAll(zip, zip.getEntry(dexName));
                    byte[] enc = Crypto.encrypt(dexKey, dex);
                    putStored(out, PrtFormat.DEX_DIR + "/" + di + ".bin", enc);
                    di++;
                }
                r.dexEncrypted = di;
                if (p != null) p.step("Encrypted " + di + " DEX file(s)", 45);

                // encrypt native libs -> assets/prt/n/<abi>/<name>.bin
                JSONArray libsJson = new JSONArray();
                for (String so : soEntries) {
                    // lib/<abi>/<file>.so
                    String[] parts = so.split("/");
                    if (parts.length < 3) continue;
                    String abi = parts[1];
                    String fname = parts[parts.length - 1];
                    byte[] data = readAll(zip, zip.getEntry(so));
                    byte[] enc = Crypto.encrypt(dexKey, data);
                    putStored(out, PrtFormat.LIB_DIR + "/" + abi + "/" + fname + ".bin", enc);
                    JSONObject lj = new JSONObject();
                    lj.put("abi", abi); lj.put("name", fname);
                    libsJson.put(lj);
                }
                r.nativeLibsEncrypted = libsJson.length();
                if (p != null) p.step("Encrypted " + r.nativeLibsEncrypted + " native lib(s)", 60);

                // config blob (encrypted under the signer-bound wrap key)
                JSONObject cfg = new JSONObject();
                cfg.put("v", 1);
                cfg.put("app", r.originalAppClass == null ? "" : r.originalAppClass);
                cfg.put("dk", Base64.getEncoder().encodeToString(dexKey));
                cfg.put("dn", di);
                cfg.put("sig", hex(key.certSha256));
                cfg.put("ln", libsJson.length());
                cfg.put("libs", libsJson);
                JSONObject flags = new JSONObject();
                flags.put("dbg", opts.antiDebug);
                flags.put("fr", opts.antiFrida);
                flags.put("emu", opts.antiEmulator);
                flags.put("tamper", opts.antiTamper);
                cfg.put("f", flags);
                byte[] cfgEnc = Crypto.encrypt(wrapKey, cfg.toString().getBytes(StandardCharsets.UTF_8));
                putStored(out, PrtFormat.CFG, cfgEnc);

                // bundle a copy of the shell dex as an asset too (not strictly needed, keeps parity)
                // private-property watermark
                putDeflated(out, PrtFormat.NOTICE, notice(opts.ownerLabel, r.packageName).getBytes(StandardCharsets.UTF_8));

                // patched manifest
                putStored(out, "AndroidManifest.xml", patchedManifest);

                // copy everything else (resources, res/, assets/, arsc), skipping originals we replaced
                java.util.Enumeration<? extends ZipEntry> e2 = zip.entries();
                while (e2.hasMoreElements()) {
                    ZipEntry ze = e2.nextElement();
                    String name = ze.getName();
                    if (ze.isDirectory()) continue;
                    if (name.equals("AndroidManifest.xml")) continue;
                    if (name.matches("classes\\d*\\.dex")) continue;
                    if (name.startsWith("META-INF/") &&
                            (name.endsWith(".RSA") || name.endsWith(".SF") || name.endsWith(".DSA")
                                    || name.equals("META-INF/MANIFEST.MF") || name.startsWith("META-INF/CERT")
                                    || name.endsWith(".version") || name.contains("SIGNAL"))) continue;
                    if (opts.encryptNativeLibs && soEntries.contains(name)) continue;

                    byte[] data = readAll(zip, ze);
                    if (name.equals("resources.arsc")) {
                        putStored(out, name, data);         // must be uncompressed + aligned
                    } else {
                        putDeflated(out, name, data);
                    }
                }
                if (p != null) p.step("Assembled protected APK", 80);
            }
        }

        // ---- sign (v1+v2+v3); apksig also aligns ----
        if (p != null) p.step("Signing", 90);
        Signing.sign(unsigned, outApk, key, opts.minSdk);
        unsigned.delete();
        r.outputSize = outApk.length();
        if (p != null) p.step("Done", 100);
        return r;
    }

    private static String notice(String label, String pkg) {
        return label + "\n" +
                "================================================\n" +
                "This application package is PRIVATE PROPERTY of its owner.\n" +
                "Package: " + pkg + "\n\n" +
                "Reverse engineering, decompilation, disassembly, static or dynamic\n" +
                "analysis, and automated/AI-assisted extraction of this application's\n" +
                "code, assets, or logic are PROHIBITED without written authorization.\n" +
                "The executable code is encrypted and protected. Unauthorized analysis\n" +
                "or tampering is detected and blocked at runtime.\n" +
                "================================================\n";
    }

    // ---- zip helpers ----

    private static void putStored(ZipOutputStream out, String name, byte[] data) throws Exception {
        ZipEntry e = new ZipEntry(name);
        e.setMethod(ZipEntry.STORED);
        e.setSize(data.length);
        e.setCompressedSize(data.length);
        CRC32 crc = new CRC32();
        crc.update(data);
        e.setCrc(crc.getValue());
        out.putNextEntry(e);
        out.write(data);
        out.closeEntry();
    }

    private static void putDeflated(ZipOutputStream out, String name, byte[] data) throws Exception {
        ZipEntry e = new ZipEntry(name);
        e.setMethod(ZipEntry.DEFLATED);
        out.putNextEntry(e);
        out.write(data);
        out.closeEntry();
    }

    private static byte[] readAll(ZipFile zip, ZipEntry e) throws Exception {
        try (InputStream in = zip.getInputStream(e)) {
            ByteArrayOutputStream bos = new ByteArrayOutputStream((int) Math.max(64, e.getSize()));
            byte[] b = new byte[8192];
            int n;
            while ((n = in.read(b)) != -1) bos.write(b, 0, n);
            return bos.toByteArray();
        }
    }

    private static String hex(byte[] b) {
        StringBuilder sb = new StringBuilder(b.length * 2);
        for (byte x : b) sb.append(String.format(Locale.US, "%02x", x));
        return sb.toString();
    }
}
