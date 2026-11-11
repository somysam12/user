# APK Protector

An Android app + engine that **packs and protects an APK** the way commercial protectors
(Virbox Protector, Jiagu/360, Tencent Legu, DexProtector) do: the real code is encrypted and
hidden, the loader stub is obfuscated, native libraries are encrypted, and the result is locked
to its signing certificate so it cannot be re-signed or tampered with.

You pick an APK on your phone, choose the protection level, and it produces a protected,
signed, installable APK.

---

## ⚠️ Honest capabilities (read this first)

No tool makes an app "impossible" to reverse engineer — not even Virbox. Every packer is
eventually unpacked by a skilled analyst using a debugger/Frida on a real device. What this
tool does is raise the cost from *"open in jadx, read everything in 2 minutes"* to
*"defeat multiple runtime defenses, dump from memory, and reconstruct"*. That is the honest,
real-world goal of app hardening, and it is exactly what this delivers.

**What is strong here**
- The original DEX is **genuinely invisible** to static tools (jadx/apktool/MT Manager see only
  the obfuscated loader stub — proven in the build).
- AES-256-GCM everywhere (confidentiality **and** integrity — payloads can't be patched in place).
- The decryption key is **bound to the signing certificate** → re-signing breaks the app
  (anti-repackaging / anti-smali-patch).
- The visible loader stub is **R8-obfuscated** to meaningless class names.

**What a determined attacker can still do** (so you know the real boundary)
- Dump the decrypted DEX from process memory at runtime (needs root + Frida + defeating the
  anti-debug/anti-Frida checks). This is true of *all* DEX-encryption packers.
- The anti-debug / anti-Frida / anti-emulator checks are Java-level signals; a patched ROM or a
  Frida script that also neutralizes every probe can bypass them. Native (NDK) implementation of
  these checks is the next hardening layer (see *Extending*).

**About "OLLVM / spaghetti code":** OLLVM (control-flow flattening, bogus control flow) is a
*compile-time* obfuscator for C/C++ **source** — it cannot be applied by any packer to code that
is already compiled (Virbox only OLLVM-obfuscates code you compile *through* its toolchain).
This tool makes the **visible stub** spaghetti via R8; to get OLLVM on native code you compile
your own `.so` with an OLLVM toolchain *before* packing.

---

## How it works

```
             ┌─────────────────────── protected.apk ───────────────────────┐
  your APK   │  classes.dex   = obfuscated loader shell (ProxyApplication)  │
  ────────▶  │  assets/prt/d/*.bin = original DEX, AES-256-GCM encrypted    │
   (engine)  │  assets/prt/n/*.bin = native .so, AES-256-GCM encrypted      │
             │  assets/prt/c.bin   = config, encrypted & signer-bound       │
             │  AndroidManifest    = <application> repointed to the shell   │
             │  (re-signed v2/v3, old signature stripped)                   │
             └──────────────────────────────────────────────────────────────┘

At runtime, inside the protected app (before any component is created):
  1. lift the hidden-API blacklist (Android 9+)
  2. derive key = SHA256(shell secret ‖ signing-cert SHA-256 ‖ package)   ← the lock
  3. decrypt config, run anti-tamper / anti-debug / anti-Frida gauntlet
  4. decrypt every original DEX *in memory* and splice it into the live classloader
  5. decrypt packed native libs to private storage and register them
  6. construct the app's ORIGINAL Application and hand control over — transparently
```

### Protections applied to every output
| Layer | What it does |
|------|--------------|
| DEX encryption | AES-256-GCM; real code only exists decrypted in memory |
| Loader obfuscation | R8 renames the stub to `a`, `b`, `c`… (only `ProxyApplication` kept) |
| Native `.so` encryption | AES-256-GCM; static IDA/Ghidra see ciphertext |
| Signer lock | key bound to the signing cert → re-sign = app won't run |
| Anti-debug | `Debug.isDebuggerConnected`, `TracerPid`/ptrace |
| Anti-Frida | `/proc/self/maps` scan, port 27042/27043 probe, gum thread names |
| Anti-emulator | fingerprint/hardware/qemu-pipe checks (optional) |
| Private-property watermark | notice embedded in every protected APK |

---

## Project layout

```
apkprotector/
├── app/                         # the Protector Android app (UI + engine)
│   └── src/main/
│       ├── java/com/protector/app/
│       │   ├── MainActivity.java        # pick APK → options → protect → save
│       │   ├── SelfGuard.java           # protects the Protector itself
│       │   └── engine/                  # the packer (pure Java, JVM-testable)
│       │       ├── ApkProtector.java    # orchestration
│       │       ├── Axml.java            # binary AndroidManifest editor
│       │       ├── Crypto.java          # AES-256-GCM
│       │       ├── PrtFormat.java       # format + signer-bound key derivation
│       │       └── Signing.java         # apksig v1/v2/v3
│       └── assets/
│           ├── prt/shell.dex            # obfuscated loader (built from shell/)
│           └── protector.p12            # bundled signing key (replace for production)
├── shell/                       # runtime loader (compiled → app assets)
│   └── src/main/java/com/protector/shell/
│       ├── ProxyApplication.java        # entry point injected into protected apps
│       ├── DexInjector.java             # classloader merge
│       ├── AntiTamper.java  HiddenApi.java  Signer.java  Crypto.java …
├── tools/
│   ├── build_shell.sh           # javac → R8 → app/src/main/assets/prt/shell.dex
│   └── test/ProtectTest.java    # JVM harness: run the whole pipeline, no device needed
└── (standard Gradle wrapper, settings.gradle, …)
```

---

## Build

Requires Android SDK (build-tools 34, platform 34) + JDK 17+.

```bash
# 1) build the obfuscated loader shell into app assets
bash tools/build_shell.sh

# 2) build the Protector app
./gradlew :app:assembleRelease     # obfuscated, signed tool  -> app-release.apk
./gradlew :app:assembleDebug       # readable, for quick testing
```

> This container blocks Maven Central (429) but allows a Google-hosted mirror, so
> `settings.gradle` points at that mirror. For a normal machine, replace it with `mavenCentral()`.

### Verify the engine without a device
```bash
javac -cp tools/testlibs/apksig.jar:tools/testlibs/json.jar -d tools/test/out \
      app/src/main/java/com/protector/app/engine/*.java tools/test/ProtectTest.java
java  -cp tools/test/out:tools/testlibs/apksig.jar:tools/testlibs/json.jar \
      com.protector.test.ProtectTest in.apk out.apk app/src/main/assets/protector.p12 \
      app/src/main/assets/prt/shell.dex /tmp/work
```

---

## Using the app

1. Install `APK-Protector-release.apk`.
2. **Select APK to protect** (any APK via the file picker).
3. Choose protections (all max by default).
4. **PROTECT** → **SAVE PROTECTED APK** (saves to Downloads).

**Signing:** you do **not** remove the original signature yourself — the engine strips it and
re-signs automatically with the bundled key. The key is part of the anti-repackaging lock, so
**do not re-sign the output** afterward or it will refuse to run. To ship under your own key,
replace `app/src/main/assets/protector.p12` (and the `signingConfigs` password) with your keystore.

---

## Extending toward "max / native-VMP" protection
- **Native anti-tamper**: reimplement `AntiTamper`/`HiddenApi` in an NDK `.so` (harder to bypass
  than Java). Hook points already exist in the shell.
- **OLLVM on native code**: compile your own `.so` with an Obfuscator-LLVM toolchain (Hikari /
  Armariris) *before* packing; the engine then encrypts the already-obfuscated binary.
- **Per-method DEX hollowing** (dpt-shell style): strip method bodies and restore them via ART
  hooks at runtime, instead of whole-DEX encryption.

---

## Legal
Intended for developers hardening **their own** applications. Only protect software you own or
are authorized to modify. Every protected APK carries a `PRIVATE_PROPERTY_NOTICE.txt`.
