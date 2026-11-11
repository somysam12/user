package com.protector.app;

import android.content.Context;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;

/**
 * Lightweight self-protection for the Protector app itself. These are the same families of
 * probe the engine injects into protected apps. Kept conservative (no emulator check) so the
 * tool stays usable, but a live debugger/ptrace or an injected Frida agent is refused.
 */
final class SelfGuard {

    /** @return a reason string if the environment is hostile, else null. */
    static String check(Context ctx) {
        if (android.os.Debug.isDebuggerConnected() || android.os.Debug.waitingForDebugger())
            return "debugger attached";
        try (BufferedReader br = new BufferedReader(new FileReader("/proc/self/status"))) {
            String line;
            while ((line = br.readLine()) != null) {
                if (line.startsWith("TracerPid:")) {
                    if (Integer.parseInt(line.substring(10).trim()) != 0) return "process is being traced";
                    break;
                }
            }
        } catch (Throwable ignored) {}
        try (BufferedReader br = new BufferedReader(new FileReader("/proc/self/maps"))) {
            String line;
            while ((line = br.readLine()) != null) {
                String low = line.toLowerCase();
                if (low.contains("frida") || low.contains("gum-js") || low.contains("libgadget")
                        || low.contains("frida-agent"))
                    return "instrumentation framework detected";
            }
        } catch (Throwable ignored) {}
        for (int port : new int[]{27042, 27043}) {
            try (java.net.Socket s = new java.net.Socket()) {
                s.connect(new java.net.InetSocketAddress("127.0.0.1", port), 100);
                return "instrumentation server detected";
            } catch (Throwable ignored) {}
        }
        return null;
    }

    private SelfGuard() {}
}
