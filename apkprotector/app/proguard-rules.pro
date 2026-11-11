# Keep Google's apksig intact (it signs the output; internal class refs must survive).
-keep class com.android.apksig.** { *; }
-dontwarn com.android.apksig.**

# org.json is provided by the Android platform at runtime.
-dontwarn org.json.**

# Our engine has no external reflection entry points, so it can be fully obfuscated.
# Activities/Application are kept automatically by the AGP default rules.

-allowaccessmodification
-repackageclasses ''
