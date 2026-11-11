/*
 * Native anti-tamper core for the Protector shell.
 *
 * Native checks are harder to defeat than the Java-level ones: an attacker must patch the .so
 * (which is encrypted by the packer) or hook libc, instead of just hooking a Dalvik method.
 *
 * This file is written so the pure-C core compiles anywhere (host clang/gcc for CI), while the
 * JNI entry points compile only when <jni.h> is present (the Android NDK build).
 *
 * MAX-protection build: compile this with an OLLVM-based toolchain (see native/README.md) so the
 * control flow is flattened, bogus branches are inserted, and instructions are substituted. Then
 * let the packer AES-encrypt the resulting .so. That combination — OLLVM on native source +
 * packer encryption — is the real "virtualization/obfuscation" route (OLLVM cannot be applied to
 * an already-compiled binary, by this tool or any other).
 */
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

/* ---- pure-C core (portable, CI-compilable) ---- */

/* 1 if the process is being ptrace'd (debugger / Frida in ptrace mode). */
int prt_is_traced(void) {
    FILE *f = fopen("/proc/self/status", "r");
    if (!f) return 0;
    char line[256];
    int traced = 0;
    while (fgets(line, sizeof(line), f)) {
        if (strncmp(line, "TracerPid:", 10) == 0) {
            long pid = strtol(line + 10, NULL, 10);
            traced = (pid != 0);
            break;
        }
    }
    fclose(f);
    return traced;
}

/* 1 if an instrumentation framework (Frida/Gum/gadget) is mapped into this process. */
int prt_frida_present(void) {
    FILE *f = fopen("/proc/self/maps", "r");
    if (!f) return 0;
    char line[512];
    int hit = 0;
    const char *marks[] = {"frida", "gum-js", "libgadget", "frida-agent", "linjector", 0};
    while (fgets(line, sizeof(line), f)) {
        for (int i = 0; marks[i]; i++) {
            if (strstr(line, marks[i])) { hit = 1; break; }
        }
        if (hit) break;
    }
    fclose(f);
    return hit;
}

/* Aggregate verdict: 0 = clean, non-zero = hostile environment. */
int prt_check(void) {
    int v = 0;
    if (prt_is_traced())     v |= 1;
    if (prt_frida_present()) v |= 2;
    return v;
}

/* ---- JNI bridge (Android NDK build only) ---- */
#if defined(__has_include)
#  if __has_include(<jni.h>)
#    include <jni.h>
#    define PRT_HAVE_JNI 1
#  endif
#endif

#ifdef PRT_HAVE_JNI
/* Called from the shell's Native class: returns the prt_check() verdict. */
JNIEXPORT jint JNICALL
Java_com_protector_shell_Native_check(JNIEnv *env, jclass clazz) {
    (void) env; (void) clazz;
    return (jint) prt_check();
}
#endif
