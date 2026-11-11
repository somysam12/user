# Keep ONLY the entry point the patched manifest names; scramble everything else.
-keep public class com.protector.shell.ProxyApplication {
    public <init>();
    protected void attachBaseContext(android.content.Context);
    public void onCreate();
    public void onConfigurationChanged(android.content.res.Configuration);
    public void onLowMemory();
    public void onTrimMemory(int);
}
-dontwarn **
-allowaccessmodification
-repackageclasses ''
-overloadaggressively
-optimizationpasses 5
# No -keepattributes: drop SourceFile, LineNumberTable, local var names, signatures.
