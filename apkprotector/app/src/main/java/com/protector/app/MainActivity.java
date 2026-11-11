package com.protector.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.OpenableColumns;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;
import com.google.android.material.checkbox.MaterialCheckBox;
import com.google.android.material.progressindicator.LinearProgressIndicator;
import com.protector.app.engine.ApkProtector;
import com.protector.app.engine.Signing;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends AppCompatActivity {

    private final ExecutorService exec = Executors.newSingleThreadExecutor();
    private final Handler ui = new Handler(Looper.getMainLooper());

    private Uri inputUri;
    private String inputName;
    private File protectedFile;
    private String suggestedOutName = "protected.apk";

    private TextView tvInput, tvStatus, tvLog;
    private LinearProgressIndicator progress;
    private MaterialButton btnProtect, btnSave;

    private ActivityResultLauncher<String[]> pickApk;
    private ActivityResultLauncher<String> createDoc;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        String tamper = SelfGuard.check(this);
        if (tamper != null) {
            Toast.makeText(this, "Protected tool blocked: " + tamper, Toast.LENGTH_LONG).show();
            finish();
            return;
        }

        tvInput = findViewById(R.id.tv_input);
        tvStatus = findViewById(R.id.tv_status);
        tvLog = findViewById(R.id.tv_log);
        progress = findViewById(R.id.progress);
        btnProtect = findViewById(R.id.btn_protect);
        btnSave = findViewById(R.id.btn_save);
        MaterialButton btnPick = findViewById(R.id.btn_pick);

        pickApk = registerForActivityResult(new ActivityResultContracts.OpenDocument(), uri -> {
            if (uri != null) {
                inputUri = uri;
                inputName = queryName(uri);
                tvInput.setText(inputName);
                btnProtect.setEnabled(true);
                btnSave.setVisibility(View.GONE);
                tvLog.setText("");
                tvStatus.setText("");
            }
        });

        createDoc = registerForActivityResult(
                new ActivityResultContracts.CreateDocument("application/vnd.android.package-archive"),
                uri -> { if (uri != null) writeOutput(uri); });

        btnPick.setOnClickListener(v -> pickApk.launch(new String[]{
                "application/vnd.android.package-archive", "application/octet-stream", "application/zip"}));
        btnProtect.setOnClickListener(v -> runProtect());
        btnSave.setOnClickListener(v -> createDoc.launch(suggestedOutName));
    }

    private void runProtect() {
        if (inputUri == null) return;
        setBusy(true);
        tvLog.setText("");
        final ApkProtector.Options opts = new ApkProtector.Options();
        opts.encryptNativeLibs = ((MaterialCheckBox) findViewById(R.id.cb_native)).isChecked();
        opts.antiDebug = ((MaterialCheckBox) findViewById(R.id.cb_debug)).isChecked();
        opts.antiFrida = ((MaterialCheckBox) findViewById(R.id.cb_frida)).isChecked();
        opts.antiTamper = ((MaterialCheckBox) findViewById(R.id.cb_tamper)).isChecked();
        opts.antiEmulator = ((MaterialCheckBox) findViewById(R.id.cb_emu)).isChecked();

        exec.execute(() -> {
            try {
                File work = new File(getCacheDir(), "work");
                work.mkdirs();
                File in = new File(getCacheDir(), "input.apk");
                copyUriToFile(inputUri, in);
                File out = new File(getCacheDir(), "protected.apk");

                Signing.KeyMaterial km;
                try (InputStream ks = getAssets().open("protector.p12")) {
                    km = Signing.loadPkcs12(ks, "protector".toCharArray(), "protector",
                            "protector".toCharArray());
                }
                byte[] shellDex = readAsset("prt/shell.dex");

                ApkProtector protector = new ApkProtector(opts, km, shellDex);
                ApkProtector.Report r = protector.protect(in, out, work, (msg, pct) ->
                        ui.post(() -> {
                            progress.setProgress(pct);
                            tvStatus.setText(msg);
                        }));

                protectedFile = out;
                suggestedOutName = (r.packageName != null ? r.packageName : "app") + "-protected.apk";
                final String report = buildReport(r);
                ui.post(() -> {
                    tvLog.setText(report);
                    tvStatus.setText("Protection complete ✓");
                    btnSave.setVisibility(View.VISIBLE);
                    setBusy(false);
                });
            } catch (Throwable t) {
                final String err = t.getClass().getSimpleName() + ": " + t.getMessage();
                ui.post(() -> {
                    tvStatus.setText("Failed");
                    tvLog.setText("ERROR\n" + err);
                    setBusy(false);
                });
            }
        });
    }

    private String buildReport(ApkProtector.Report r) {
        StringBuilder sb = new StringBuilder();
        sb.append("PROTECTED ✓\n");
        sb.append("package        : ").append(r.packageName).append('\n');
        sb.append("orig App class : ").append(r.originalAppClass == null ? "(none)" : r.originalAppClass).append('\n');
        sb.append("DEX encrypted  : ").append(r.dexEncrypted).append('\n');
        sb.append("native libs    : ").append(r.nativeLibsEncrypted).append('\n');
        sb.append("input size     : ").append(human(r.inputSize)).append('\n');
        sb.append("output size    : ").append(human(r.outputSize)).append('\n');
        sb.append("signer SHA-256 : ").append(r.signerCertSha256.substring(0, 24)).append("…\n");
        sb.append("\nThe protected APK is signed and locked to this signer.\n");
        sb.append("Do NOT re-sign it — the anti-repackaging lock will block it.");
        return sb.toString();
    }

    private void writeOutput(Uri dest) {
        exec.execute(() -> {
            try (OutputStream os = getContentResolver().openOutputStream(dest)) {
                byte[] data = new byte[1 << 16];
                try (InputStream is = new java.io.FileInputStream(protectedFile)) {
                    int n;
                    while ((n = is.read(data)) != -1) os.write(data, 0, n);
                }
                ui.post(() -> Toast.makeText(this, "Saved protected APK", Toast.LENGTH_LONG).show());
            } catch (Throwable t) {
                ui.post(() -> Toast.makeText(this, "Save failed: " + t.getMessage(), Toast.LENGTH_LONG).show());
            }
        });
    }

    // ---- helpers ----

    private void setBusy(boolean busy) {
        progress.setVisibility(busy ? View.VISIBLE : View.GONE);
        btnProtect.setEnabled(!busy && inputUri != null);
        findViewById(R.id.btn_pick).setEnabled(!busy);
    }

    private void copyUriToFile(Uri uri, File out) throws Exception {
        try (InputStream is = getContentResolver().openInputStream(uri);
             FileOutputStream fos = new FileOutputStream(out)) {
            byte[] b = new byte[1 << 16];
            int n;
            while ((n = is.read(b)) != -1) fos.write(b, 0, n);
        }
    }

    private byte[] readAsset(String path) throws Exception {
        try (InputStream is = getAssets().open(path)) {
            java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
            byte[] b = new byte[1 << 16];
            int n;
            while ((n = is.read(b)) != -1) bos.write(b, 0, n);
            return bos.toByteArray();
        }
    }

    private String queryName(Uri uri) {
        String name = "input.apk";
        try (android.database.Cursor c = getContentResolver().query(uri, null, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int idx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (idx >= 0) name = c.getString(idx);
            }
        } catch (Exception ignored) {}
        return name;
    }

    private static String human(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format(java.util.Locale.US, "%.1f KB", bytes / 1024.0);
        return String.format(java.util.Locale.US, "%.1f MB", bytes / (1024.0 * 1024));
    }
}
