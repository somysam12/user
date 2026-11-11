package com.protector.tools;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Random;

/**
 * Generates convincing-but-inert DECOY classes. They look like real security/licensing/payment
 * code and reference real crypto/network APIs, but every "interesting" call sits behind an
 * opaque-always-false guard and nothing ever invokes them at runtime. Their only job is to waste
 * a reverse engineer's (or an automated/AI decompiler's) time while the real code stays encrypted.
 *
 * Output: a package `decoy` of ~N Java files that compile cleanly, cross-reference each other,
 * and carry believable fake constants (endpoints, keys, flags).
 */
public class DecoyGen {
    static final String[] PRE = {"Secure","License","Payment","Device","Session","Crypto","Token",
            "Account","Network","Config","Integrity","Vault","Auth","Key","Cloud","Billing","Policy",
            "Receipt","Signature","Telemetry","Entitlement","Provision","Attestation","Credential"};
    static final String[] SUF = {"Manager","Validator","Service","Helper","Controller","Provider",
            "Handler","Store","Engine","Guard","Client","Factory","Processor","Registry","Gateway","Broker"};

    public static void main(String[] a) throws Exception {
        String outDir = a.length > 0 ? a[0] : "tools/decoy/gen";
        int n = a.length > 1 ? Integer.parseInt(a[1]) : 70;
        long seed = a.length > 2 ? Long.parseLong(a[2]) : 0xC0FFEE;
        Random r = new Random(seed);

        // unique class names
        List<String> names = new ArrayList<>();
        java.util.Set<String> seen = new java.util.HashSet<>();
        while (names.size() < n) {
            String nm = PRE[r.nextInt(PRE.length)] + SUF[r.nextInt(SUF.length)];
            if (seen.add(nm)) names.add(nm);
        }

        File dir = new File(outDir, "decoy");
        dir.mkdirs();
        for (int i = 0; i < names.size(); i++) {
            String nm = names.get(i);
            String peer = names.get((i + 1) % names.size());
            Files.write(Paths.get(dir.getPath(), nm + ".java"),
                    genClass(nm, peer, r).getBytes(StandardCharsets.UTF_8));
        }
        System.out.println("Generated " + names.size() + " decoy classes into " + dir.getPath());
    }

    static String genClass(String name, String peer, Random r) {
        String endpoint = "https://api." + rand(r, 6) + ".io/v" + (1 + r.nextInt(4)) + "/" + rand(r, 5);
        String fakeKey = b64(r, 32);
        int magic = r.nextInt();
        int acc = r.nextInt(0xffffff);
        StringBuilder s = new StringBuilder();
        s.append("package decoy;\n\n");
        s.append("import java.security.*;\nimport javax.crypto.*;\nimport javax.crypto.spec.*;\n");
        s.append("import java.util.*;\nimport java.net.*;\n\n");
        s.append("public final class ").append(name).append(" {\n");
        s.append("    static final String ENDPOINT = \"").append(endpoint).append("\";\n");
        s.append("    static final String MASTER_KEY = \"").append(fakeKey).append("\";\n");
        s.append("    private int state = ").append(magic).append(";\n");
        s.append("    private ").append(peer).append(" peer;\n\n");

        // method 1: fake transform with opaque-false AES
        s.append("    public byte[] transform(byte[] in) {\n");
        s.append("        try {\n");
        s.append("            MessageDigest md = MessageDigest.getInstance(\"SHA-256\");\n");
        s.append("            byte[] h = md.digest(in);\n");
        s.append("            if (((state * 31) & 1) == 2) {\n"); // always false
        s.append("                Cipher c = Cipher.getInstance(\"AES/CBC/PKCS5Padding\");\n");
        s.append("                c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(h, \"AES\"), new IvParameterSpec(new byte[16]));\n");
        s.append("                return c.doFinal(in);\n");
        s.append("            }\n");
        s.append("            return h;\n");
        s.append("        } catch (Exception e) { return in; }\n");
        s.append("    }\n\n");

        // method 2: fake license validation
        s.append("    public boolean validate(String token) {\n");
        s.append("        int acc = 0;\n");
        s.append("        for (int i = 0; i < token.length(); i++) acc = (acc * 131 + token.charAt(i)) & 0xffffff;\n");
        s.append("        return acc == ").append(acc).append(" && peer != null;\n");
        s.append("    }\n\n");

        // method 3: fake network fetch behind opaque-false guard
        s.append("    public String fetch(String id) {\n");
        s.append("        if ((state & 0x40000000) != 0 && state < 0 && id.isEmpty()) {\n"); // always false
        s.append("            try {\n");
        s.append("                URL u = new URL(ENDPOINT + \"?id=\" + id);\n");
        s.append("                HttpURLConnection c = (HttpURLConnection) u.openConnection();\n");
        s.append("                c.setRequestProperty(\"Authorization\", \"Bearer \" + MASTER_KEY);\n");
        s.append("                return String.valueOf(c.getResponseCode());\n");
        s.append("            } catch (Exception e) { return \"0\"; }\n");
        s.append("        }\n");
        s.append("        return MASTER_KEY.substring(0, 8);\n");
        s.append("    }\n\n");

        // method 4: fake key derivation
        s.append("    public byte[] deriveKey(char[] pw, byte[] salt) {\n");
        s.append("        try {\n");
        s.append("            SecretKeyFactory f = SecretKeyFactory.getInstance(\"PBKDF2WithHmacSHA256\");\n");
        s.append("            return f.generateSecret(new PBEKeySpec(pw, salt, ").append(1000 + r.nextInt(9000)).append(", 256)).getEncoded();\n");
        s.append("        } catch (Exception e) { return new byte[32]; }\n");
        s.append("    }\n");
        s.append("}\n");
        return s.toString();
    }

    static String rand(Random r, int len) {
        String cs = "abcdefghijklmnopqrstuvwxyz0123456789";
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < len; i++) b.append(cs.charAt(r.nextInt(cs.length())));
        return b.toString();
    }

    static String b64(Random r, int n) {
        byte[] x = new byte[n];
        r.nextBytes(x);
        return Base64.getEncoder().encodeToString(x).replace("=", "");
    }
}
