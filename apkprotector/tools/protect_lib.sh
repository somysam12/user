#!/usr/bin/env bash
# Obfuscate a library's INTERNAL code while keeping its public API linkable.
# Works on a .jar or an .aar (Android library). This is a desktop step: R8 needs a JVM
# and android.jar, so it cannot run on-device (true of every bytecode obfuscator).
#
#   protect_lib.sh <input.jar|input.aar> <output.jar|output.aar> [extra-classpath.jar ...]
set -euo pipefail

SDK="${ANDROID_HOME:-/opt/android-sdk}"
R8JAR="$SDK/build-tools/34.0.0/lib/d8.jar"
ANDROID_JAR="$SDK/platforms/android-34/android.jar"
SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
PRO="$SELF_DIR/lib.pro"

IN="$1"; OUT="$2"; shift 2
EXTRA_LIBS=("$@")

LIBARGS=(--lib "$ANDROID_JAR")
for l in "${EXTRA_LIBS[@]:-}"; do [ -n "$l" ] && LIBARGS+=(--lib "$l"); done

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

obfuscate_jar() { # <in.jar> <out.jar>
  java -cp "$R8JAR" com.android.tools.r8.R8 \
       --classfile --release \
       "${LIBARGS[@]}" \
       --pg-conf "$PRO" \
       --output "$2" \
       "$1"
}

case "$IN" in
  *.aar)
    echo "[lib] AAR mode"
    unzip -q "$IN" -d "$WORK/aar"
    if [ ! -f "$WORK/aar/classes.jar" ]; then echo "AAR has no classes.jar"; exit 1; fi
    obfuscate_jar "$WORK/aar/classes.jar" "$WORK/classes-out.jar"
    # R8 --output <file.jar> writes a jar; replace classes.jar and repackage the AAR
    cp "$WORK/classes-out.jar" "$WORK/aar/classes.jar"
    (cd "$WORK/aar" && zip -q -r -X "$WORK/out.aar" .)
    cp "$WORK/out.aar" "$OUT"
    ;;
  *.jar)
    echo "[lib] JAR mode"
    obfuscate_jar "$IN" "$OUT"
    ;;
  *)
    echo "Unsupported input (want .jar or .aar): $IN"; exit 1;;
esac
echo "[lib] wrote $OUT ($(wc -c < "$OUT") bytes)"
