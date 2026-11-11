package com.protector.shell;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.content.pm.SigningInfo;
import android.os.Build;

import java.security.MessageDigest;

/** Reads this process's own APK signing certificate and hashes it. */
final class Signer {

    /** SHA-256 of the (first) signing certificate of the running APK, or null if unavailable. */
    static byte[] ownCertSha256(Context ctx) {
        try {
            PackageManager pm = ctx.getPackageManager();
            String pkg = ctx.getPackageName();
            Signature[] sigs;
            if (Build.VERSION.SDK_INT >= 28) {
                PackageInfo pi = pm.getPackageInfo(pkg, PackageManager.GET_SIGNING_CERTIFICATES);
                SigningInfo si = pi.signingInfo;
                if (si == null) return null;
                sigs = si.hasMultipleSigners() ? si.getApkContentsSigners() : si.getSigningCertificateHistory();
            } else {
                @SuppressWarnings("deprecation")
                PackageInfo pi = pm.getPackageInfo(pkg, PackageManager.GET_SIGNATURES);
                sigs = pi.signatures;
            }
            if (sigs == null || sigs.length == 0) return null;
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return md.digest(sigs[0].toByteArray());
        } catch (Throwable t) {
            return null;
        }
    }

    static String hex(byte[] b) {
        if (b == null) return "";
        StringBuilder sb = new StringBuilder(b.length * 2);
        for (byte x : b) sb.append(Character.forDigit((x >> 4) & 0xF, 16)).append(Character.forDigit(x & 0xF, 16));
        return sb.toString();
    }

    private Signer() {}
}
