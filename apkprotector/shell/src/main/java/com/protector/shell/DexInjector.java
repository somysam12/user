package com.protector.shell;

import android.os.Build;

import java.io.File;
import java.lang.reflect.Array;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;

import dalvik.system.InMemoryDexClassLoader;

/**
 * Injects the decrypted original DEX (and, if present, native-lib dirs) into the EXISTING
 * app classloader. We merge into the running PathClassLoader rather than replacing it, because
 * the framework (LoadedApk.mClassLoader, every already-created Context) holds that exact
 * instance. Merge = originals resolve through the same loader the system already uses.
 */
final class DexInjector {

    /** Load decrypted dex bytes purely in memory and splice them to the front of the app loader. */
    static void injectDex(ClassLoader appClassLoader, ByteBuffer[] dexBuffers) throws Exception {
        InMemoryDexClassLoader seed = new InMemoryDexClassLoader(dexBuffers, appClassLoader.getParent());

        Object appPathList = field(appClassLoader, S.g(S.PATHLIST));
        Object seedPathList = field(seed, S.g(S.PATHLIST));

        Object appElements = field(appPathList, S.g(S.DEXELEMENTS));
        Object seedElements = field(seedPathList, S.g(S.DEXELEMENTS));

        // seed (original app) first, so its classes take precedence over the stub.
        Object merged = concat(seedElements, appElements);
        setField(appPathList, S.g(S.DEXELEMENTS), merged);
    }

    /** Make decrypted native libraries (already written under {@code libDir}) resolvable. */
    static void injectNativeDir(ClassLoader appClassLoader, File libDir) throws Exception {
        Object pathList = field(appClassLoader, S.g(S.PATHLIST));

        // nativeLibraryDirectories : List<File>
        try {
            Field f = pathList.getClass().getDeclaredField(S.g(S.NATIVEDIRS));
            f.setAccessible(true);
            Object cur = f.get(pathList);
            List<File> dirs;
            if (cur instanceof List) {
                dirs = (List<File>) cur;
            } else {
                dirs = new ArrayList<>();
            }
            if (!dirs.contains(libDir)) dirs.add(0, libDir);
            f.set(pathList, dirs);
        } catch (NoSuchFieldException ignored) {}

        // nativeLibraryPathElements : Element[]  (API 25+). Rebuild it from the dirs.
        try {
            Field fElems = pathList.getClass().getDeclaredField(S.g(S.NATIVEELEMS));
            fElems.setAccessible(true);
            Object existing = fElems.get(pathList);

            Object newElement = makeNativeElement(libDir);
            Object combined;
            if (existing != null) {
                combined = prepend(existing, newElement);
            } else {
                Class<?> elemClass = newElement.getClass();
                combined = Array.newInstance(elemClass, 1);
                Array.set(combined, 0, newElement);
            }
            fElems.set(pathList, combined);
        } catch (NoSuchFieldException ignored) {}
    }

    private static Object makeNativeElement(File dir) throws Exception {
        // dalvik.system.DexPathList$Element — constructor shape changed across versions.
        Class<?> elemClass = Class.forName(S.g(S.DEXPATHELEM));
        try {
            // Newer AOSP: Element(File path, boolean isDirectory, File zip, DexFile dexFile)
            java.lang.reflect.Constructor<?> c = elemClass.getDeclaredConstructor(
                    File.class, boolean.class, File.class, Class.forName(S.g(S.DEXFILE)));
            c.setAccessible(true);
            return c.newInstance(dir, true, null, null);
        } catch (NoSuchMethodException e) {
            // Native-only Element(File dir) on some builds.
            java.lang.reflect.Constructor<?> c = elemClass.getDeclaredConstructor(File.class);
            c.setAccessible(true);
            return c.newInstance(dir);
        }
    }

    // ---- reflection helpers ----

    private static Object field(Object obj, String name) throws Exception {
        Class<?> c = obj.getClass();
        while (c != null) {
            try {
                Field f = c.getDeclaredField(name);
                f.setAccessible(true);
                return f.get(obj);
            } catch (NoSuchFieldException e) {
                c = c.getSuperclass();
            }
        }
        throw new NoSuchFieldException(name);
    }

    private static void setField(Object obj, String name, Object value) throws Exception {
        Class<?> c = obj.getClass();
        while (c != null) {
            try {
                Field f = c.getDeclaredField(name);
                f.setAccessible(true);
                f.set(obj, value);
                return;
            } catch (NoSuchFieldException e) {
                c = c.getSuperclass();
            }
        }
        throw new NoSuchFieldException(name);
    }

    private static Object concat(Object first, Object second) {
        int n1 = Array.getLength(first), n2 = Array.getLength(second);
        Class<?> comp = first.getClass().getComponentType();
        Object out = Array.newInstance(comp, n1 + n2);
        System.arraycopy(first, 0, out, 0, n1);
        System.arraycopy(second, 0, out, n1, n2);
        return out;
    }

    private static Object prepend(Object arr, Object element) {
        int n = Array.getLength(arr);
        Class<?> comp = arr.getClass().getComponentType();
        Object out = Array.newInstance(comp, n + 1);
        Array.set(out, 0, element);
        System.arraycopy(arr, 0, out, 1, n);
        return out;
    }

    private DexInjector() {}
}
