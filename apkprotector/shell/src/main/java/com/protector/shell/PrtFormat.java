package com.protector.shell;

/**
 * On-disk format contract. Must stay byte-for-byte identical to the engine side
 * (com.protector.app.engine.PrtFormat). Changing anything here means re-generating shell.dex.
 */
final class PrtFormat {
    /** Root asset folder inside the protected APK. */
    static final String DIR = "prt";
    /** Encrypted config blob (AES-GCM under the wrap key). */
    static final String CFG = DIR + "/c.bin";
    /** Encrypted DEX payloads live at prt/d/<index>.bin */
    static final String DEX_DIR = DIR + "/d";
    /** Encrypted native libraries live at prt/n/<abi>/<name>.bin */
    static final String LIB_DIR = DIR + "/n";

    /**
     * The shared secret baked into the shell. It is NOT stored as a single literal:
     * it is reassembled at runtime from XOR-split parts so a plain `strings` dump
     * of the dex/so does not reveal it. This is a speed bump, not a vault — the
     * real binding below is the signer-certificate hash.
     */
    static byte[] shellSecret() {
        // part_a XOR part_b, interleaved — reconstructed only at runtime.
        byte[] a = new byte[]{
                (byte) 0x9E, (byte) 0x1C, (byte) 0x74, (byte) 0xB3, (byte) 0x2A, (byte) 0xF5, (byte) 0x60, (byte) 0x0D,
                (byte) 0xC8, (byte) 0x41, (byte) 0x97, (byte) 0x3E, (byte) 0xDA, (byte) 0x55, (byte) 0x82, (byte) 0x6B
        };
        byte[] b = new byte[]{
                (byte) 0x37, (byte) 0xA9, (byte) 0x02, (byte) 0x5E, (byte) 0xCC, (byte) 0x11, (byte) 0x88, (byte) 0xF4,
                (byte) 0x6D, (byte) 0x20, (byte) 0xBB, (byte) 0x49, (byte) 0x07, (byte) 0x93, (byte) 0xE1, (byte) 0x7A
        };
        byte[] out = new byte[16];
        for (int i = 0; i < 16; i++) out[i] = (byte) (a[i] ^ b[i]);
        return out;
    }

    /**
     * Derive the key that unwraps the per-app DEX key.
     * Binds decryption to: our shell secret + the exact signing certificate + the package name.
     * Re-signing the protected APK (required to tamper and reinstall) changes signerCertSha256,
     * which changes this key, which makes decryption fail. That is the anti-repackaging lock.
     */
    static byte[] wrapKey(byte[] signerCertSha256, String packageName) {
        return Crypto.sha256(shellSecret(), signerCertSha256, packageName.getBytes());
    }

    private PrtFormat() {}
}
