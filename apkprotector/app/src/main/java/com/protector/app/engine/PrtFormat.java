package com.protector.app.engine;

/**
 * On-disk format contract — must stay byte-for-byte identical to
 * com.protector.shell.PrtFormat, including shellSecret() and wrapKey().
 */
public final class PrtFormat {
    public static final String DIR = "prt";
    public static final String CFG = DIR + "/c.bin";
    public static final String DEX_DIR = DIR + "/d";
    public static final String LIB_DIR = DIR + "/n";
    public static final String SHELL_DEX_ASSET = DIR + "/shell.dex";
    public static final String NOTICE = "PRIVATE_PROPERTY_NOTICE.txt";

    public static byte[] shellSecret() {
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

    /** key = SHA256(shellSecret || signerCertSha256 || packageName). Binds to the signer. */
    public static byte[] wrapKey(byte[] signerCertSha256, String packageName) {
        return Crypto.sha256(shellSecret(), signerCertSha256, packageName.getBytes());
    }

    private PrtFormat() {}
}
