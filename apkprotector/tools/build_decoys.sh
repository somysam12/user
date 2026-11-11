#!/usr/bin/env bash
# Generate decoy (fake) classes and compile them into app/src/main/assets/prt/decoy.dex.
# The engine injects this as classes2.dex of every protected APK: believable bait code that
# an analyst / AI decompiler must wade through, while the real code stays encrypted.
set -euo pipefail

SDK="${ANDROID_HOME:-/opt/android-sdk}"
BT="$SDK/build-tools/34.0.0"
ANDROID_JAR="$SDK/platforms/android-34/android.jar"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GENTOOL="$ROOT/tools/decoy"
GEN="$GENTOOL/gen"
ASSET_DIR="$ROOT/app/src/main/assets/prt"
COUNT="${1:-70}"

rm -rf "$GENTOOL/toolout" "$GEN" "$GENTOOL/classes"
mkdir -p "$GENTOOL/toolout" "$ASSET_DIR"

echo "[decoy] generating $COUNT decoy classes ..."
javac -d "$GENTOOL/toolout" "$GENTOOL/DecoyGen.java"
java -cp "$GENTOOL/toolout" com.protector.tools.DecoyGen "$GEN" "$COUNT"

echo "[decoy] javac decoys ..."
mkdir -p "$GENTOOL/classes"
javac --release 17 -d "$GENTOOL/classes" $(find "$GEN" -name '*.java')

echo "[decoy] d8 -> decoy.dex ..."
"$BT/d8" --min-api 26 --lib "$ANDROID_JAR" --output "$GENTOOL" $(find "$GENTOOL/classes" -name '*.class')
mv "$GENTOOL/classes.dex" "$ASSET_DIR/decoy.dex"
echo "[decoy] wrote $ASSET_DIR/decoy.dex ($(wc -c < "$ASSET_DIR/decoy.dex") bytes)"
echo "[decoy] sample bait classes:"
"$BT/dexdump" "$ASSET_DIR/decoy.dex" 2>/dev/null | grep "Class descriptor" | head -8
