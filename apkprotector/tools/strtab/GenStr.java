package com.protector.tools;

import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Generates shell/S.java: an encrypted string table so the obfuscated loader stub contains
 * no readable technique strings. Each string i is XORed with a keystream = SHA-256 chain of
 * (SEED ++ i). Deterministic and reversible; this generator also self-verifies the round-trip.
 */
public class GenStr {
    static final byte[] SEED = {(byte) 0x5A, (byte) 0xC3, (byte) 0x19, (byte) 0xE7};

    public static void main(String[] a) throws Exception {
        Map<String, String> s = new LinkedHashMap<>(); // CONST -> value
        // hidden-api
        put(s, "FORNAME", "forName");
        put(s, "GETDECLMETHOD", "getDeclaredMethod");
        put(s, "VMRUNTIME", "dalvik.system.VMRuntime");
        put(s, "GETRUNTIME", "getRuntime");
        put(s, "SETEXEMPT", "setHiddenApiExemptions");
        put(s, "LPREFIX", "L");
        // ActivityThread / classloader reflection
        put(s, "ACTIVITYTHREAD", "android.app.ActivityThread");
        put(s, "CURRENTAT", "currentActivityThread");
        put(s, "MINITIALAPP", "mInitialApplication");
        put(s, "MALLAPPS", "mAllApplications");
        put(s, "MBOUNDAPP", "mBoundApplication");
        put(s, "INFO", "info");
        put(s, "MAPPLICATION", "mApplication");
        put(s, "MAPPINFO", "mApplicationInfo");
        put(s, "ATTACH", "attach");
        put(s, "PATHLIST", "pathList");
        put(s, "DEXELEMENTS", "dexElements");
        put(s, "NATIVEDIRS", "nativeLibraryDirectories");
        put(s, "NATIVEELEMS", "nativeLibraryPathElements");
        put(s, "DEXPATHELEM", "dalvik.system.DexPathList$Element");
        put(s, "DEXFILE", "dalvik.system.DexFile");
        put(s, "PRTLIB", ".prtlib");
        // anti-analysis
        put(s, "PROC_STATUS", "/proc/self/status");
        put(s, "TRACERPID", "TracerPid:");
        put(s, "PROC_MAPS", "/proc/self/maps");
        put(s, "PROC_TASK", "/proc/self/task");
        put(s, "COMM", "comm");
        put(s, "FRIDA", "frida");
        put(s, "GUMJS", "gum-js-loop");
        put(s, "GMAIN", "gmain");
        put(s, "LINJECTOR", "linjector");
        put(s, "FRIDA_AGENT", "frida-agent");
        put(s, "FRIDA_GADGET", "frida-gadget");
        put(s, "GADGET", "gadget");
        put(s, "LIBFRIDA", "libfrida");
        put(s, "GDBUS", "gdbus");
        put(s, "GUM", "gum");
        put(s, "LIBGADGET", "libgadget");
        put(s, "GUMJS2", "gum-js");
        put(s, "LOCALHOST", "127.0.0.1");
        // asset layout
        put(s, "PRT", "prt");
        put(s, "PRT_CFG", "prt/c.bin");
        put(s, "PRT_D", "prt/d");
        put(s, "PRT_N", "prt/n");

        String[] keys = s.keySet().toArray(new String[0]);
        String[] vals = s.values().toArray(new String[0]);

        StringBuilder sb = new StringBuilder();
        sb.append("package com.protector.shell;\n\n");
        sb.append("import java.nio.charset.StandardCharsets;\nimport java.security.MessageDigest;\n\n");
        sb.append("/** Encrypted string table (generated). Hides loader internals from static analysis. */\n");
        sb.append("final class S {\n");
        sb.append("    private static final byte[] SEED = {");
        for (int i = 0; i < SEED.length; i++) sb.append("(byte)").append(SEED[i] & 0xFF).append(i < SEED.length - 1 ? "," : "");
        sb.append("};\n");
        for (int i = 0; i < keys.length; i++) sb.append("    static final int ").append(keys[i]).append(" = ").append(i).append(";\n");
        sb.append("\n    private static final byte[][] T = {\n");
        for (int i = 0; i < vals.length; i++) {
            byte[] enc = xor(i, vals[i].getBytes(StandardCharsets.UTF_8));
            sb.append("        {");
            for (int j = 0; j < enc.length; j++) sb.append("(byte)").append(enc[j] & 0xFF).append(j < enc.length - 1 ? "," : "");
            sb.append("},\n");
        }
        sb.append("    };\n\n");
        sb.append("    static String g(int i) {\n");
        sb.append("        byte[] c = T[i];\n");
        sb.append("        byte[] ks = ks(i, c.length);\n");
        sb.append("        byte[] o = new byte[c.length];\n");
        sb.append("        for (int j = 0; j < c.length; j++) o[j] = (byte) (c[j] ^ ks[j]);\n");
        sb.append("        return new String(o, StandardCharsets.UTF_8);\n");
        sb.append("    }\n\n");
        sb.append("    private static byte[] ks(int i, int len) {\n");
        sb.append("        try {\n");
        sb.append("            MessageDigest md = MessageDigest.getInstance(\"SHA-256\");\n");
        sb.append("            md.update(SEED);\n");
        sb.append("            md.update((byte) i); md.update((byte) (i >> 8)); md.update((byte) (i >> 16)); md.update((byte) (i >> 24));\n");
        sb.append("            byte[] block = md.digest();\n");
        sb.append("            byte[] out = new byte[len];\n");
        sb.append("            int p = 0;\n");
        sb.append("            while (p < len) {\n");
        sb.append("                int n = Math.min(32, len - p);\n");
        sb.append("                System.arraycopy(block, 0, out, p, n);\n");
        sb.append("                p += n;\n");
        sb.append("                if (p < len) { md.reset(); block = md.digest(block); }\n");
        sb.append("            }\n");
        sb.append("            return out;\n");
        sb.append("        } catch (Exception e) { throw new RuntimeException(e); }\n");
        sb.append("    }\n");
        sb.append("    private S() {}\n");
        sb.append("}\n");

        String outPath = a.length > 0 ? a[0] : "shell/src/main/java/com/protector/shell/S.java";
        Files.write(Paths.get(outPath), sb.toString().getBytes(StandardCharsets.UTF_8));

        // self-verify round-trip
        PrintStream o = System.out;
        boolean ok = true;
        for (int i = 0; i < vals.length; i++) {
            byte[] enc = xor(i, vals[i].getBytes(StandardCharsets.UTF_8));
            String dec = new String(xor(i, enc), StandardCharsets.UTF_8);
            if (!dec.equals(vals[i])) { ok = false; o.println("MISMATCH at " + i + " " + keys[i]); }
        }
        o.println("Wrote " + outPath + " with " + vals.length + " strings. Round-trip " + (ok ? "OK" : "FAILED"));
    }

    static void put(Map<String, String> m, String k, String v) { m.put(k, v); }

    // keystream identical to S.ks()
    static byte[] xor(int i, byte[] data) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        md.update(SEED);
        md.update((byte) i); md.update((byte) (i >> 8)); md.update((byte) (i >> 16)); md.update((byte) (i >> 24));
        byte[] block = md.digest();
        byte[] ks = new byte[data.length];
        int p = 0;
        while (p < data.length) {
            int n = Math.min(32, data.length - p);
            System.arraycopy(block, 0, ks, p, n);
            p += n;
            if (p < data.length) { md.reset(); block = md.digest(block); }
        }
        byte[] out = new byte[data.length];
        for (int j = 0; j < data.length; j++) out[j] = (byte) (data[j] ^ ks[j]);
        return out;
    }
}
