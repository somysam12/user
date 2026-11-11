package com.protector.shell;

import android.content.Context;
import android.os.Build;
import android.os.Process;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.Arrays;

/**
 * Runtime integrity / hostile-environment checks. None of these is individually unbeatable —
 * each is a signal. Together they force an attacker onto a patched ROM or a Frida script that
 * also neutralises every probe here, which is exactly the cost we are trying to impose.
 */
final class AntiTamper {

    static final class Policy {
        boolean antiDebug, antiFrida, antiEmulator, antiTamper;
        String expectedSignerHashHex; // may be empty
    }

    /** Runs the enabled checks. Returns a human-readable reason on detection, or null if clean. */
    static String scan(Context ctx, Policy p) {
        if (p.antiTamper && p.expectedSignerHashHex != null && !p.expectedSignerHashHex.isEmpty()) {
            byte[] own = Signer.ownCertSha256(ctx);
            String got = Signer.hex(own);
            if (!p.expectedSignerHashHex.equalsIgnoreCase(got)) {
                return "signature-mismatch";
            }
        }
        if (p.antiDebug) {
            String r = debuggerSignal(ctx);
            if (r != null) return r;
        }
        if (p.antiFrida) {
            String r = fridaSignal();
            if (r != null) return r;
        }
        if (p.antiEmulator) {
            String r = emulatorSignal();
            if (r != null) return r;
        }
        return null;
    }

    private static String debuggerSignal(Context ctx) {
        if (android.os.Debug.isDebuggerConnected() || android.os.Debug.waitingForDebugger())
            return "debugger-attached";
        // ptrace tracer (jdb, gdb, Frida in ptrace mode) shows up as TracerPid.
        try (BufferedReader br = new BufferedReader(new FileReader(S.g(S.PROC_STATUS)))) {
            String line;
            while ((line = br.readLine()) != null) {
                if (line.startsWith(S.g(S.TRACERPID))) {
                    int pid = Integer.parseInt(line.substring(10).trim());
                    if (pid != 0) return "tracer-pid";
                    break;
                }
            }
        } catch (Throwable ignored) {}
        return null;
    }

    private static String[] fridaMarkers() {
        return new String[]{
                S.g(S.FRIDA), S.g(S.GUMJS), S.g(S.GMAIN), S.g(S.LINJECTOR),
                S.g(S.FRIDA_AGENT), S.g(S.FRIDA_GADGET), S.g(S.GADGET), S.g(S.LIBFRIDA)
        };
    }

    private static String fridaSignal() {
        // 1) injected native libs / regions in our own address space.
        try (BufferedReader br = new BufferedReader(new FileReader(S.g(S.PROC_MAPS)))) {
            String line;
            while ((line = br.readLine()) != null) {
                String low = line.toLowerCase();
                for (String m : fridaMarkers()) {
                    if (low.contains(m)) return "m1";
                }
            }
        } catch (Throwable ignored) {}
        // 2) default frida-server control port.
        for (int port : new int[]{27042, 27043}) {
            try (Socket s = new Socket()) {
                s.connect(new InetSocketAddress(S.g(S.LOCALHOST), port), 120);
                return "m2";
            } catch (Throwable ignored) {}
        }
        // 3) threads named by gum/gmain.
        File td = new File(S.g(S.PROC_TASK));
        File[] tasks = td.listFiles();
        if (tasks != null) {
            for (File t : tasks) {
                try (BufferedReader br = new BufferedReader(new FileReader(new File(t, S.g(S.COMM))))) {
                    String name = br.readLine();
                    if (name != null) {
                        String low = name.toLowerCase();
                        if (low.contains(S.g(S.GMAIN)) || low.contains(S.g(S.GDBUS)) || low.contains(S.g(S.GUM)))
                            return "m3";
                    }
                } catch (Throwable ignored) {}
            }
        }
        return null;
    }

    private static String emulatorSignal() {
        String fp = s(Build.FINGERPRINT), model = s(Build.MODEL), hw = s(Build.HARDWARE),
                product = s(Build.PRODUCT), board = s(Build.BOARD), brand = s(Build.BRAND);
        if (fp.contains("generic") || fp.contains("vbox") || fp.contains("emulator") || fp.contains("sdk_gphone"))
            return "emu-fingerprint";
        if (model.contains("emulator") || model.contains("android sdk built for"))
            return "emu-model";
        if (Arrays.asList("goldfish", "ranchu", "vbox86").contains(hw)) return "emu-hardware";
        if (product.contains("sdk") || product.contains("vbox") || product.contains("emulator"))
            return "emu-product";
        if (brand.startsWith("generic") && board.startsWith("unknown")) return "emu-brand";
        for (String f : new String[]{"/dev/socket/qemud", "/dev/qemu_pipe", "/system/lib/libc_malloc_debug_qemu.so"})
            if (new File(f).exists()) return "emu-file";
        return null;
    }

    /** Kill the process hard. Called when a check fires and the policy says abort. */
    static void react() {
        try { Process.killProcess(Process.myPid()); } catch (Throwable ignored) {}
        System.exit(1);
    }

    private static String s(String v) { return v == null ? "" : v.toLowerCase(); }

    private AntiTamper() {}
}
