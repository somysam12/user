#!/usr/bin/env bash
# Compiles the runtime loader-shell (com.protector.shell) into a single classes.dex
# and drops it into the Protector app's assets as prt/shell.dex.
# The Protector app bundles this dex and makes it the classes.dex of every APK it protects.
set -euo pipefail

SDK="${ANDROID_HOME:-/opt/android-sdk}"
BT="$SDK/build-tools/34.0.0"
ANDROID_JAR="$SDK/platforms/android-34/android.jar"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/shell/src/main/java"
OUT="$ROOT/shell/build"
ASSET_DIR="$ROOT/app/src/main/assets/prt"

rm -rf "$OUT"
mkdir -p "$OUT/classes" "$ASSET_DIR"

echo "[shell] javac ..."
find "$SRC" -name '*.java' > "$OUT/sources.txt"
javac -source 17 -target 17 -encoding UTF-8 \
      -classpath "$ANDROID_JAR" \
      -d "$OUT/classes" \
      @"$OUT/sources.txt"

echo "[shell] R8 (obfuscate + shrink) ..."
CLASS_FILES=$(find "$OUT/classes" -name '*.class')
# d8.jar in build-tools ships the full R8; run the R8 main class directly.
java -cp "$BT/lib/d8.jar" com.android.tools.r8.R8 \
     --release --min-api 26 \
     --lib "$ANDROID_JAR" \
     --pg-conf "$ROOT/shell/shell.pro" \
     --output "$OUT" \
     $CLASS_FILES

mv "$OUT/classes.dex" "$ASSET_DIR/shell.dex"
echo "[shell] wrote $ASSET_DIR/shell.dex ($(wc -c < "$ASSET_DIR/shell.dex") bytes)"
echo "[shell] visible class names in obfuscated shell:"
"$BT/dexdump" "$ASSET_DIR/shell.dex" 2>/dev/null | grep "Class descriptor" | head -40
