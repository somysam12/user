package com.protector.shell;

import android.app.Application;
import android.app.Instrumentation;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.res.Configuration;
import android.os.Build;
import android.util.Base64;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.ByteBuffer;
import java.util.List;

/**
 * The protected APK's real entry point. The engine rewrites AndroidManifest so that
 * android:name on <application> points here. Boot sequence (all inside attachBaseContext,
 * before any component or ContentProvider is created):
 *
 *   1. lift the hidden-API blacklist
 *   2. derive the wrap key from (shell secret + signing cert + package)
 *   3. decrypt the config blob, run the anti-tamper gauntlet
 *   4. decrypt every original DEX in memory and splice it into the live classloader
 *   5. decrypt packed native libs to private storage and register their directory
 *   6. construct the app's ORIGINAL Application and make the framework believe it is the one
 *
 * onCreate then forwards to the original Application. To the original code, nothing happened.
 */
public class ProxyApplication extends Application {

    private Application delegate;

    @Override
    protected void attachBaseContext(Context base) {
        super.attachBaseContext(base);
        HiddenApi.unseal();
        try {
            boot(base);
        } catch (Throwable t) {
            // A hard failure here means the payload was tampered with or the key did not derive.
            // Fail closed: do not run a half-initialised app.
            throw new RuntimeException("init", t);
        }
    }

    private void boot(Context base) throws Exception {
        byte[] certSha = Signer.ownCertSha256(base);
        byte[] wrapKey = PrtFormat.wrapKey(certSha, base.getPackageName());

        byte[] cfgBlob = Assets.read(base, PrtFormat.CFG);
        byte[] cfgBytes = Crypto.decrypt(wrapKey, cfgBlob); // fails if re-signed / corrupted
        JSONObject cfg = new JSONObject(new String(cfgBytes, "UTF-8"));

        // ---- anti-tamper gauntlet ----
        JSONObject f = cfg.optJSONObject("f");
        AntiTamper.Policy pol = new AntiTamper.Policy();
        pol.antiDebug = f == null || f.optBoolean("dbg", true);
        pol.antiFrida = f == null || f.optBoolean("fr", true);
        pol.antiEmulator = f != null && f.optBoolean("emu", false);
        pol.antiTamper = f == null || f.optBoolean("tamper", true);
        pol.expectedSignerHashHex = cfg.optString("sig", "");
        String reason = AntiTamper.scan(base, pol);
        if (reason != null) {
            AntiTamper.react();
            return;
        }

        // ---- decrypt + inject original DEX (in memory, never touches disk as plaintext) ----
        byte[] dexKey = Base64.decode(cfg.getString("dk"), Base64.NO_WRAP);
        int dexCount = cfg.getInt("dn");
        ByteBuffer[] buffers = new ByteBuffer[dexCount];
        for (int i = 0; i < dexCount; i++) {
            byte[] enc = Assets.read(base, PrtFormat.DEX_DIR + "/" + i + ".bin");
            byte[] dex = Crypto.decrypt(dexKey, enc);
            buffers[i] = ByteBuffer.wrap(dex);
        }
        DexInjector.injectDex(base.getClassLoader(), buffers);

        // ---- decrypt + register packed native libraries (if any) ----
        if (cfg.optInt("ln", 0) > 0) {
            File outDir = unpackNativeLibs(base, cfg, dexKey);
            if (outDir != null) DexInjector.injectNativeDir(base.getClassLoader(), outDir);
        }

        // ---- hand off to the original Application ----
        String origName = cfg.optString("app", "");
        if (origName != null && !origName.isEmpty()
                && !origName.equals("android.app.Application")) {
            delegate = buildOriginalApplication(base, origName);
        }
    }

    private File unpackNativeLibs(Context base, JSONObject cfg, byte[] dexKey) {
        try {
            String primaryAbi = Build.SUPPORTED_ABIS != null && Build.SUPPORTED_ABIS.length > 0
                    ? Build.SUPPORTED_ABIS[0] : "arm64-v8a";
            File root = new File(base.getFilesDir(), S.g(S.PRTLIB));
            File abiDir = new File(root, primaryAbi);
            abiDir.mkdirs();
            org.json.JSONArray libs = cfg.optJSONArray("libs");
            if (libs == null) return null;
            boolean any = false;
            for (int i = 0; i < libs.length(); i++) {
                JSONObject l = libs.getJSONObject(i);
                String abi = l.getString("abi");
                String name = l.getString("name");
                if (!abi.equals(primaryAbi)) continue;
                byte[] enc = Assets.read(base, PrtFormat.LIB_DIR + "/" + abi + "/" + name + ".bin");
                byte[] so = Crypto.decrypt(dexKey, enc);
                File out = new File(abiDir, name);
                try (FileOutputStream fos = new FileOutputStream(out)) {
                    fos.write(so);
                }
                any = true;
            }
            return any ? abiDir : null;
        } catch (Throwable t) {
            return null;
        }
    }

    /** Create the original Application and rewire the framework's references to it. */
    private Application buildOriginalApplication(Context base, String name) {
        try {
            Application app = (Application) base.getClassLoader()
                    .loadClass(name).getDeclaredConstructor().newInstance();

            // attach(Context) is the hidden method ActivityThread normally calls.
            Method attach = Application.class.getDeclaredMethod(S.g(S.ATTACH), Context.class);
            attach.setAccessible(true);
            attach.invoke(app, getBaseContext());

            swapFrameworkRefs(app, name);
            return app;
        } catch (Throwable t) {
            // Degrade gracefully: classes are already loaded; the proxy stays as the Application.
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private void swapFrameworkRefs(Application app, String name) {
        try {
            Class<?> atClass = Class.forName(S.g(S.ACTIVITYTHREAD));
            Method current = atClass.getDeclaredMethod(S.g(S.CURRENTAT));
            current.setAccessible(true);
            Object at = current.invoke(null);

            // ActivityThread.mInitialApplication -> real app
            setField(at, S.g(S.MINITIALAPP), app);

            // ActivityThread.mAllApplications : replace this proxy with the real app
            try {
                Field fAll = atClass.getDeclaredField(S.g(S.MALLAPPS));
                fAll.setAccessible(true);
                List<Application> all = (List<Application>) fAll.get(at);
                if (all != null) {
                    all.remove(this);
                    if (!all.contains(app)) all.add(app);
                }
            } catch (Throwable ignored) {}

            // LoadedApk.mApplication -> real app, and fix className on its ApplicationInfo
            Field fBound = atClass.getDeclaredField(S.g(S.MBOUNDAPP));
            fBound.setAccessible(true);
            Object bound = fBound.get(at);
            Object loadedApk = getField(bound, S.g(S.INFO));
            if (loadedApk != null) {
                setField(loadedApk, S.g(S.MAPPLICATION), app);
                Object ai = getFieldSafe(loadedApk, S.g(S.MAPPINFO));
                if (ai instanceof ApplicationInfo) ((ApplicationInfo) ai).className = name;
            }
        } catch (Throwable ignored) {
            // If the ROM's internals differ, the app still runs with classes loaded.
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        if (delegate != null) {
            delegate.onCreate();
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        if (delegate != null) delegate.onConfigurationChanged(newConfig);
    }

    @Override
    public void onLowMemory() {
        super.onLowMemory();
        if (delegate != null) delegate.onLowMemory();
    }

    @Override
    public void onTrimMemory(int level) {
        super.onTrimMemory(level);
        if (delegate != null) delegate.onTrimMemory(level);
    }

    // ---- small reflection helpers ----
    private static void setField(Object target, String field, Object value) throws Exception {
        Field f = target.getClass().getDeclaredField(field);
        f.setAccessible(true);
        f.set(target, value);
    }

    private static Object getField(Object target, String field) throws Exception {
        Field f = target.getClass().getDeclaredField(field);
        f.setAccessible(true);
        return f.get(target);
    }

    private static Object getFieldSafe(Object target, String field) {
        try { return getField(target, field); } catch (Throwable t) { return null; }
    }
}
