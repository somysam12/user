# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Expo modules
-keep class expo.modules.** { *; }
-keep class host.exp.exponent.** { *; }

# Keep native methods
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
    native <methods>;
}

# OkHttp / ExoPlayer (used by expo-av)
-keep class com.google.android.exoplayer2.** { *; }
-dontwarn com.google.android.exoplayer2.**
-dontwarn okhttp3.**
-dontwarn okio.**

# Aggressive size reduction
-optimizationpasses 5
-allowaccessmodification
-repackageclasses ''
-mergeinterfacesaggressively
-overloadaggressively
-useuniqueclassmembernames

# Remove logging in release
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}

# Add any project specific keep options here:
