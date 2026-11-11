package com.protector.shell;

import android.content.Context;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/** Minimal asset reader for the encrypted payloads. */
final class Assets {
    static byte[] read(Context ctx, String path) throws Exception {
        try (InputStream in = ctx.getAssets().open(path)) {
            ByteArrayOutputStream bos = new ByteArrayOutputStream(Math.max(1024, in.available()));
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) != -1) bos.write(buf, 0, n);
            return bos.toByteArray();
        }
    }

    static boolean exists(Context ctx, String path) {
        try (InputStream in = ctx.getAssets().open(path)) {
            return true;
        } catch (Throwable t) {
            return false;
        }
    }

    private Assets() {}
}
