# Library obfuscation: keep the PUBLIC API (so consumers still link), scramble everything internal.
-keep public class * {
    public protected *;
}
# Keep annotations/generics/inner-class metadata consumers rely on at compile time.
-keepattributes Signature,InnerClasses,EnclosingMethod,Exceptions,*Annotation*,Deprecated
-keepparameternames

# Libraries are linked, not run standalone — don't drop "unused" public API or reorder semantics.
-dontshrink
-dontoptimize

-dontwarn **
-allowaccessmodification
-repackageclasses ''
