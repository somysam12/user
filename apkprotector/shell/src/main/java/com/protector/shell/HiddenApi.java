package com.protector.shell;

import java.lang.reflect.Method;

/**
 * Lifts the hidden-API blacklist (Android 9+/API 28+) for this process so the shell can
 * reflect into ActivityThread/LoadedApk internals. Uses the well-known double-reflection
 * trampoline: we reach VMRuntime.setHiddenApiExemptions through Class.getDeclaredMethod
 * obtained reflectively, so our own call site is never flagged.
 */
final class HiddenApi {

    static void unseal() {
        if (android.os.Build.VERSION.SDK_INT < 28) return;
        try {
            Method forName = Class.class.getDeclaredMethod("forName", String.class);
            Method getDeclaredMethod = Class.class.getDeclaredMethod(
                    "getDeclaredMethod", String.class, Class[].class);

            Class<?> vmRuntimeClass = (Class<?>) forName.invoke(null, "dalvik.system.VMRuntime");
            Method getRuntime = (Method) getDeclaredMethod.invoke(
                    vmRuntimeClass, "getRuntime", null);
            Method setHiddenApiExemptions = (Method) getDeclaredMethod.invoke(
                    vmRuntimeClass, "setHiddenApiExemptions", new Class[]{String[].class});

            Object vmRuntime = getRuntime.invoke(null);
            // "L" is the prefix for every descriptor, so this exempts all hidden APIs.
            setHiddenApiExemptions.invoke(vmRuntime, new Object[]{new String[]{"L"}});
        } catch (Throwable ignored) {
            // Older ROMs or vendor changes — reflection below may still work without the lift.
        }
    }

    private HiddenApi() {}
}
