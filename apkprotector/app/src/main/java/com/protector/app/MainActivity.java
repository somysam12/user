package com.protector.app;

import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.OpenableColumns;
import android.text.TextUtils;
import android.view.View;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;
import com.google.android.material.button.MaterialButtonToggleGroup;
import com.google.android.material.checkbox.MaterialCheckBox;
import com.google.android.material.materialswitch.MaterialSwitch;
import com.google.android.material.progressindicator.LinearProgressIndicator;
import com.protector.app.engine.ApkProtector;
import com.protector.app.engine.BinaryProtector;
import com.protector.app.engine.Signing;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends AppCompatActivity {

    private final ExecutorService exec = Executors.newSingleThreadExecutor();
    private final Handler ui = new Handler(Looper.getMainLooper());

    // shared status
    private TextView tvStatus, tvLog;
    private LinearProgressIndicator progress;

    // APK mode
    private Uri apkUri, keystoreUri;
    private String apkName;
    private File apkOut;
    private TextView tvApkIn, tvKeystore;
    private MaterialButton btnProtect, btnSaveApk;

    // Binary / Library modes
    private Uri binUri, libUri;
    private String binName, libName;
    private File binOut, libOut;
    private TextView tvBinIn, tvLibIn;
    private MaterialButton btnRunBin, btnSaveBin, btnRunLib, btnSaveLib;

    // save plumbing (shared)
    private File pendingSaveFile;
    private ActivityResultLauncher<String> createDoc;
    private ActivityResultLauncher<String[]> pickApk, pickKeystore, pickBin, pickLib;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        setContentView(R.layout.activity_main);

        String tamper = SelfGuard.check(this);
        if (tamper != null) { Toast.makeText(this, "Blocked: " + tamper, Toast.LENGTH_LONG).show(); finish(); return; }

        tvStatus = findViewById(R.id.tv_status);
        tvLog = findViewById(R.id.tv_log);
        progress = findViewById(R.id.progress);
        tvApkIn = findViewById(R.id.tv_input);
        tvKeystore = findViewById(R.id.tv_keystore);
        tvBinIn = findViewById(R.id.tv_bin_input);
        tvLibIn = findViewById(R.id.tv_lib_input);
        btnProtect = findViewById(R.id.btn_protect);
        btnSaveApk = findViewById(R.id.btn_save);
        btnRunBin = findViewById(R.id.btn_run_bin);
        btnSaveBin = findViewById(R.id.btn_save_bin);
        btnRunLib = findViewById(R.id.btn_run_lib);
        btnSaveLib = findViewById(R.id.btn_save_lib);

        // mode switch
        MaterialButtonToggleGroup modes = findViewById(R.id.mode_group);
        View secApk = findViewById(R.id.section_apk), secBin = findViewById(R.id.section_bin), secLib = findViewById(R.id.section_lib);
        modes.check(R.id.mode_apk);
        modes.addOnButtonCheckedListener((g, id, checked) -> {
            if (!checked) return;
            secApk.setVisibility(id == R.id.mode_apk ? View.VISIBLE : View.GONE);
            secBin.setVisibility(id == R.id.mode_bin ? View.VISIBLE : View.GONE);
            secLib.setVisibility(id == R.id.mode_lib ? View.VISIBLE : View.GONE);
            tvLog.setText(""); tvStatus.setText("");
        });

        // pickers
        pickApk = registerForActivityResult(new ActivityResultContracts.OpenDocument(), u -> {
            if (u != null) { apkUri = u; apkName = name(u); tvApkIn.setText(apkName); btnProtect.setEnabled(true); btnSaveApk.setVisibility(View.GONE); }
        });
        pickKeystore = registerForActivityResult(new ActivityResultContracts.OpenDocument(), u -> {
            if (u != null) { keystoreUri = u; tvKeystore.setText(name(u)); }
        });
        pickBin = registerForActivityResult(new ActivityResultContracts.OpenDocument(), u -> {
            if (u != null) { binUri = u; binName = name(u); tvBinIn.setText(binName); btnRunBin.setEnabled(true); btnSaveBin.setVisibility(View.GONE); }
        });
        pickLib = registerForActivityResult(new ActivityResultContracts.OpenDocument(), u -> {
            if (u != null) { libUri = u; libName = name(u); tvLibIn.setText(libName); btnRunLib.setEnabled(true); btnSaveLib.setVisibility(View.GONE); }
        });
        createDoc = registerForActivityResult(new ActivityResultContracts.CreateDocument("application/octet-stream"), u -> { if (u != null) writeOut(u); });

        findViewById(R.id.btn_pick).setOnClickListener(v -> pickApk.launch(new String[]{"*/*"}));
        findViewById(R.id.btn_pick_keystore).setOnClickListener(v -> pickKeystore.launch(new String[]{"*/*"}));
        findViewById(R.id.btn_pick_bin).setOnClickListener(v -> pickBin.launch(new String[]{"*/*"}));
        findViewById(R.id.btn_pick_lib).setOnClickListener(v -> pickLib.launch(new String[]{"*/*"}));

        btnProtect.setOnClickListener(v -> runApk());
        btnRunBin.setOnClickListener(v -> runBinary());
        btnRunLib.setOnClickListener(v -> runLibrary());

        btnSaveApk.setOnClickListener(v -> save(apkOut, suggest(apkName, "-protected.apk")));
        btnSaveBin.setOnClickListener(v -> save(binOut, binOut != null ? binOut.getName() : "output.bin"));
        btnSaveLib.setOnClickListener(v -> save(libOut, libOut != null ? libOut.getName() : "output.enc"));

        MaterialSwitch sw = findViewById(R.id.sw_bin_decrypt);
        sw.setOnCheckedChangeListener((bv, c) -> btnRunBin.setText(c ? "DECRYPT" : "ENCRYPT"));
    }

    // ---------- APK ----------
    private void runApk() {
        if (apkUri == null) return;
        busy(true); tvLog.setText("");
        final ApkProtector.Options o = new ApkProtector.Options();
        o.encryptNativeLibs = cb(R.id.cb_native);
        o.antiDebug = cb(R.id.cb_debug); o.antiFrida = cb(R.id.cb_frida);
        o.antiTamper = cb(R.id.cb_tamper); o.antiEmulator = cb(R.id.cb_emu);
        o.injectDecoys = cb(R.id.cb_decoy);
        for (String s : text(R.id.et_exclude_libs).split("[,\\s]+")) if (!s.isEmpty()) o.excludeLibs.add(s.trim());
        final String storePass = text(R.id.et_store_pass), alias = text(R.id.et_alias), keyPass = text(R.id.et_key_pass);

        exec.execute(() -> {
            try {
                File work = new File(getCacheDir(), "work"); work.mkdirs();
                File in = new File(getCacheDir(), "in.apk"); copy(apkUri, in);
                File out = new File(getCacheDir(), "out.apk");

                Signing.KeyMaterial km;
                if (keystoreUri != null) {
                    byte[] raw = readUri(keystoreUri);
                    char[] sp = storePass.isEmpty() ? new char[0] : storePass.toCharArray();
                    char[] kp = keyPass.isEmpty() ? sp : keyPass.toCharArray();
                    km = Signing.loadKeystore(null, raw, null, sp, alias.isEmpty() ? null : alias, kp);
                    ui.post(() -> tvStatus.setText("Using your keystore"));
                } else {
                    try (InputStream ks = getAssets().open("protector.p12")) {
                        km = Signing.loadPkcs12(ks, "protector".toCharArray(), "protector", "protector".toCharArray());
                    }
                }
                byte[] shell = readAsset("prt/shell.dex");
                byte[] decoy = null; try { decoy = readAsset("prt/decoy.dex"); } catch (Exception ignored) {}

                ApkProtector.Report r = new ApkProtector(o, km, shell, decoy)
                        .protect(in, out, work, (m, p) -> ui.post(() -> { progress.setProgress(p); tvStatus.setText(m); }));
                apkOut = out;
                StringBuilder sb = new StringBuilder("PROTECTED ✓\n");
                sb.append("package      : ").append(r.packageName).append('\n');
                sb.append("orig App     : ").append(r.originalAppClass == null ? "(none)" : r.originalAppClass).append('\n');
                sb.append("DEX encrypted: ").append(r.dexEncrypted).append('\n');
                sb.append("native libs  : ").append(r.nativeLibsEncrypted).append('\n');
                sb.append("decoys       : ").append(r.decoysInjected ? "yes" : "no").append('\n');
                sb.append("signer       : ").append(r.signerCertSha256.substring(0, 20)).append("…\n");
                sb.append("size         : ").append(human(r.inputSize)).append(" → ").append(human(r.outputSize)).append('\n');
                sb.append(keystoreUri != null
                        ? "\nSigned with YOUR key — installs over your app."
                        : "\nSigned with built-in test key. If install fails with a\nsignature conflict, uninstall the old app OR use your key.");
                final String report = sb.toString();
                ui.post(() -> { tvLog.setText(report); tvStatus.setText("Done ✓"); btnSaveApk.setVisibility(View.VISIBLE); busy(false); });
            } catch (Throwable t) { fail(t); }
        });
    }

    // ---------- Binary ----------
    private void runBinary() {
        if (binUri == null) return;
        boolean decrypt = ((MaterialSwitch) findViewById(R.id.sw_bin_decrypt)).isChecked();
        String pass = text(R.id.et_bin_pass);
        if (pass.isEmpty()) { Toast.makeText(this, "Enter a password", Toast.LENGTH_SHORT).show(); return; }
        busy(true); tvLog.setText("");
        exec.execute(() -> {
            try {
                byte[] data = readUri(binUri);
                byte[] res = decrypt ? BinaryProtector.decrypt(data, pass.toCharArray())
                        : BinaryProtector.encrypt(data, pass.toCharArray());
                String outName = decrypt
                        ? (binName.endsWith(".enc") ? binName.substring(0, binName.length() - 4) : binName + ".dec")
                        : binName + ".enc";
                File out = new File(getCacheDir(), outName);
                try (FileOutputStream f = new FileOutputStream(out)) { f.write(res); }
                binOut = out;
                final String msg = (decrypt ? "Decrypted" : "Encrypted") + " ✓\n" + binName + " → " + outName
                        + "\n" + human(data.length) + " → " + human(res.length);
                ui.post(() -> { tvLog.setText(msg); tvStatus.setText("Done ✓"); btnSaveBin.setVisibility(View.VISIBLE); busy(false); });
            } catch (Throwable t) { fail(t); }
        });
    }

    // ---------- Library (container-encrypt) ----------
    private void runLibrary() {
        if (libUri == null) return;
        String pass = text(R.id.et_lib_pass);
        if (pass.isEmpty()) { Toast.makeText(this, "Enter a password", Toast.LENGTH_SHORT).show(); return; }
        busy(true); tvLog.setText("");
        exec.execute(() -> {
            try {
                byte[] data = readUri(libUri);
                byte[] res = BinaryProtector.encrypt(data, pass.toCharArray());
                File out = new File(getCacheDir(), libName + ".enc");
                try (FileOutputStream f = new FileOutputStream(out)) { f.write(res); }
                libOut = out;
                final String msg = "Container-encrypted ✓\n" + libName + " → " + out.getName()
                        + "\n\nNote: for LINKABLE obfuscation run tools/protect_lib.sh on a PC.";
                ui.post(() -> { tvLog.setText(msg); tvStatus.setText("Done ✓"); btnSaveLib.setVisibility(View.VISIBLE); busy(false); });
            } catch (Throwable t) { fail(t); }
        });
    }

    // ---------- helpers ----------
    private void save(File f, String name) { if (f == null) return; pendingSaveFile = f; createDoc.launch(name); }

    private void writeOut(Uri dest) {
        exec.execute(() -> {
            try (OutputStream os = getContentResolver().openOutputStream(dest);
                 InputStream is = new FileInputStream(pendingSaveFile)) {
                byte[] b = new byte[1 << 16]; int n; while ((n = is.read(b)) != -1) os.write(b, 0, n);
                ui.post(() -> Toast.makeText(this, "Saved", Toast.LENGTH_LONG).show());
            } catch (Throwable t) { ui.post(() -> Toast.makeText(this, "Save failed: " + t.getMessage(), Toast.LENGTH_LONG).show()); }
        });
    }

    private void fail(Throwable t) {
        StringWriter sw = new StringWriter(); t.printStackTrace(new PrintWriter(sw));
        final String err = "ERROR: " + t.getClass().getSimpleName() + ": " + t.getMessage() + "\n\n" + sw;
        ui.post(() -> { tvStatus.setText("Failed"); tvLog.setText(err); busy(false); });
    }

    private void busy(boolean b) {
        progress.setVisibility(b ? View.VISIBLE : View.GONE);
        btnProtect.setEnabled(!b && apkUri != null);
        btnRunBin.setEnabled(!b && binUri != null);
        btnRunLib.setEnabled(!b && libUri != null);
    }

    private boolean cb(int id) { return ((MaterialCheckBox) findViewById(id)).isChecked(); }
    private String text(int id) { EditText e = findViewById(id); return e.getText() == null ? "" : e.getText().toString().trim(); }
    private String suggest(String base, String suffix) {
        if (base == null) return "output" + suffix;
        int dot = base.lastIndexOf('.'); return (dot > 0 ? base.substring(0, dot) : base) + suffix;
    }

    private void copy(Uri uri, File out) throws Exception {
        try (InputStream is = getContentResolver().openInputStream(uri); FileOutputStream f = new FileOutputStream(out)) {
            byte[] b = new byte[1 << 16]; int n; while ((n = is.read(b)) != -1) f.write(b, 0, n);
        }
    }
    private byte[] readUri(Uri uri) throws Exception {
        try (InputStream is = getContentResolver().openInputStream(uri)) { return drain(is); }
    }
    private byte[] readAsset(String p) throws Exception { try (InputStream is = getAssets().open(p)) { return drain(is); } }
    private static byte[] drain(InputStream is) throws Exception {
        ByteArrayOutputStream bos = new ByteArrayOutputStream(); byte[] b = new byte[1 << 16]; int n;
        while ((n = is.read(b)) != -1) bos.write(b, 0, n); return bos.toByteArray();
    }
    private String name(Uri uri) {
        String nm = "file";
        try (android.database.Cursor c = getContentResolver().query(uri, null, null, null, null)) {
            if (c != null && c.moveToFirst()) { int i = c.getColumnIndex(OpenableColumns.DISPLAY_NAME); if (i >= 0) nm = c.getString(i); }
        } catch (Exception ignored) {}
        return nm;
    }
    private static String human(long b) {
        if (b < 1024) return b + " B";
        if (b < 1048576) return String.format(java.util.Locale.US, "%.1f KB", b / 1024.0);
        return String.format(java.util.Locale.US, "%.1f MB", b / 1048576.0);
    }
}
