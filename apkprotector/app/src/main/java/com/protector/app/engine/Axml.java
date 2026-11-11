package com.protector.app.engine;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * A focused binary AndroidManifest.xml (AXML) reader/writer.
 *
 * It parses the whole chunk tree into an editable model and re-serialises it, which keeps all
 * size/offset bookkeeping correct. It supports exactly the edit the packer needs:
 *   - read the original <application android:name>
 *   - set <application android:name> to the shell's ProxyApplication (repoint, or insert the
 *     attribute reusing the existing android:name resource-mapped string index).
 *
 * References inside AXML are string-pool INDICES, so we only ever append strings at the end of
 * the pool (never insert among the resource-mapped attribute names), keeping every index stable.
 */
public final class Axml {

    // chunk types
    private static final int RES_XML_TYPE = 0x0003;
    private static final int RES_STRING_POOL_TYPE = 0x0001;
    private static final int RES_XML_RESOURCE_MAP_TYPE = 0x0180;
    private static final int RES_XML_START_NAMESPACE = 0x0100;
    private static final int RES_XML_END_NAMESPACE = 0x0101;
    private static final int RES_XML_START_ELEMENT = 0x0102;
    private static final int RES_XML_END_ELEMENT = 0x0103;
    private static final int RES_XML_CDATA = 0x0104;

    private static final int UTF8_FLAG = 0x00000100;
    private static final int TYPE_STRING = 0x03;
    private static final long ATTR_ID_NAME = 0x01010003L;      // android:name
    private static final String ANDROID_NS = "http://schemas.android.com/apk/res/android";

    // ---- model ----
    private int poolFlags;
    private boolean utf8;
    private final List<String> strings = new ArrayList<>();
    private long[] resourceMap = new long[0];
    private final List<Node> nodes = new ArrayList<>();

    private static final class Attr {
        int ns, name, rawValue, dataType, data;
        short valueSize = 8; byte res0 = 0;
    }

    private static final class Node {
        int type;          // chunk type
        int lineNumber;
        int comment = -1;
        // namespace nodes
        int nsPrefix, nsUri;
        // element nodes
        int ns = -1, name = -1;
        int idIndex, classIndex, styleIndex;
        List<Attr> attrs;  // start element only
        // cdata
        int cdataRaw; int cdataType; int cdataData;
    }

    // ================= parsing =================

    public static Axml parse(byte[] buf) {
        Axml a = new Axml();
        a.read(buf);
        return a;
    }

    private void read(byte[] b) {
        Cursor c = new Cursor(b, 0);
        int type = c.u16(); c.u16(); /*headerSize*/ c.u32(); /*fileSize*/
        if (type != RES_XML_TYPE) throw new IllegalArgumentException("not AXML (0x" + Integer.toHexString(type) + ")");

        while (c.pos < b.length) {
            int chunkStart = c.pos;
            int ctype = c.u16();
            int headerSize = c.u16();
            long size = c.u32();
            if (size <= 0) break;
            int next = (int) (chunkStart + size);

            switch (ctype) {
                case RES_STRING_POOL_TYPE:
                    readStringPool(b, chunkStart, headerSize);
                    break;
                case RES_XML_RESOURCE_MAP_TYPE:
                    readResourceMap(b, chunkStart, headerSize, (int) size);
                    break;
                case RES_XML_START_NAMESPACE:
                case RES_XML_END_NAMESPACE: {
                    Node n = new Node(); n.type = ctype;
                    n.lineNumber = (int) c.u32(); n.comment = c.u32s();
                    n.nsPrefix = c.u32s(); n.nsUri = c.u32s();
                    nodes.add(n);
                    break;
                }
                case RES_XML_START_ELEMENT: {
                    Node n = new Node(); n.type = ctype;
                    n.lineNumber = (int) c.u32(); n.comment = c.u32s();
                    n.ns = c.u32s(); n.name = c.u32s();
                    c.u16(); /*attributeStart*/ c.u16(); /*attributeSize*/
                    int attrCount = c.u16();
                    n.idIndex = c.u16(); n.classIndex = c.u16(); n.styleIndex = c.u16();
                    n.attrs = new ArrayList<>(attrCount);
                    for (int i = 0; i < attrCount; i++) {
                        Attr at = new Attr();
                        at.ns = c.u32s(); at.name = c.u32s(); at.rawValue = c.u32s();
                        at.valueSize = (short) c.u16(); at.res0 = (byte) c.u8();
                        at.dataType = c.u8(); at.data = (int) c.u32();
                        n.attrs.add(at);
                    }
                    nodes.add(n);
                    break;
                }
                case RES_XML_END_ELEMENT: {
                    Node n = new Node(); n.type = ctype;
                    n.lineNumber = (int) c.u32(); n.comment = c.u32s();
                    n.ns = c.u32s(); n.name = c.u32s();
                    nodes.add(n);
                    break;
                }
                case RES_XML_CDATA: {
                    Node n = new Node(); n.type = ctype;
                    n.lineNumber = (int) c.u32(); n.comment = c.u32s();
                    n.cdataRaw = c.u32s();
                    n.cdataType = 0; // skip typed value detail; we never emit cdata changes
                    // read Res_value (8 bytes)
                    c.u16(); c.u8(); n.cdataType = c.u8(); n.cdataData = (int) c.u32();
                    nodes.add(n);
                    break;
                }
                default:
                    break; // skip unknown chunk
            }
            c.pos = next;
        }
    }

    private void readStringPool(byte[] b, int chunkStart, int headerSize) {
        Cursor c = new Cursor(b, chunkStart + 8);
        int stringCount = (int) c.u32();
        int styleCount = (int) c.u32();
        poolFlags = (int) c.u32();
        int stringsStart = (int) c.u32();
        c.u32(); // stylesStart
        utf8 = (poolFlags & UTF8_FLAG) != 0;

        int[] offsets = new int[stringCount];
        for (int i = 0; i < stringCount; i++) offsets[i] = (int) c.u32();
        // skip style offsets
        int dataBase = chunkStart + stringsStart;
        for (int i = 0; i < stringCount; i++) {
            strings.add(decodeString(b, dataBase + offsets[i]));
        }
        // style data ignored (manifests have none)
        if (styleCount != 0) {
            throw new IllegalStateException("styled manifest string pool unsupported");
        }
    }

    private String decodeString(byte[] b, int p) {
        if (utf8) {
            int[] r = {p};
            decodeLen8(b, r);          // utf16 length (chars) — ignored
            int byteLen = decodeLen8(b, r);
            return new String(b, r[0], byteLen, StandardCharsets.UTF_8);
        } else {
            int len = u16le(b, p); p += 2;
            if ((len & 0x8000) != 0) { // high bit => length is 2 units
                int hi = len & 0x7FFF;
                int lo = u16le(b, p); p += 2;
                len = (hi << 16) | lo;
            }
            return new String(b, p, len * 2, StandardCharsets.UTF_16LE);
        }
    }

    private static int decodeLen8(byte[] b, int[] r) {
        int p = r[0];
        int v = b[p++] & 0xFF;
        if ((v & 0x80) != 0) {
            v = ((v & 0x7F) << 8) | (b[p++] & 0xFF);
        }
        r[0] = p;
        return v;
    }

    private void readResourceMap(byte[] b, int chunkStart, int headerSize, int size) {
        int count = (size - headerSize) / 4;
        resourceMap = new long[count];
        Cursor c = new Cursor(b, chunkStart + headerSize);
        for (int i = 0; i < count; i++) resourceMap[i] = c.u32();
    }

    // ================= queries / edits =================

    private int indexOfString(String s) {
        return strings.indexOf(s);
    }

    private int addString(String s) {
        int i = strings.indexOf(s);
        if (i >= 0) return i;
        strings.add(s);
        return strings.size() - 1;
    }

    /** string-pool index of the attribute name that maps to android:name (0x01010003). */
    private int nameAttrIndex() {
        for (int i = 0; i < resourceMap.length; i++) {
            if (resourceMap[i] == ATTR_ID_NAME) return i;
        }
        return -1;
    }

    private Node findApplication() {
        for (Node n : nodes) {
            if (n.type == RES_XML_START_ELEMENT && n.name >= 0
                    && "application".equals(strings.get(n.name))
                    && (n.ns < 0)) { // application element is in the default (no) namespace
                return n;
            }
        }
        // fallback: match by local name regardless of ns
        for (Node n : nodes) {
            if (n.type == RES_XML_START_ELEMENT && n.name >= 0
                    && "application".equals(strings.get(n.name))) return n;
        }
        return null;
    }

    /** The {@code package} attribute on the root <manifest> element. */
    public String getManifestPackage() {
        for (Node n : nodes) {
            if (n.type == RES_XML_START_ELEMENT && n.name >= 0 && "manifest".equals(strings.get(n.name))) {
                for (Attr a : n.attrs) {
                    if (a.ns < 0 && a.name >= 0 && "package".equals(strings.get(a.name))) {
                        return a.rawValue >= 0 ? strings.get(a.rawValue) : null;
                    }
                }
            }
        }
        return null;
    }

    /** The current android:name on <application>, or null if absent. */
    public String getApplicationName() {
        Node app = findApplication();
        if (app == null) return null;
        int nameIdx = nameAttrIndex();
        int nsIdx = indexOfString(ANDROID_NS);
        for (Attr a : app.attrs) {
            if (a.name == nameIdx && (a.ns == nsIdx || nsIdx < 0)) {
                return a.rawValue >= 0 ? strings.get(a.rawValue) : null;
            }
        }
        return null;
    }

    /**
     * Point <application android:name> at {@code newClass}. Returns the previous value (or null).
     * Inserts the attribute if it was absent, reusing the resource-mapped android:name index.
     */
    public String setApplicationName(String newClass) {
        Node app = findApplication();
        if (app == null) throw new IllegalStateException("no <application> element");
        int nameIdx = nameAttrIndex();
        if (nameIdx < 0) throw new IllegalStateException("manifest has no android:name resource mapping");
        int nsIdx = indexOfString(ANDROID_NS);
        if (nsIdx < 0) throw new IllegalStateException("manifest has no android namespace");
        int newIdx = addString(newClass);

        for (Attr a : app.attrs) {
            if (a.name == nameIdx && a.ns == nsIdx) {
                String prev = a.rawValue >= 0 ? strings.get(a.rawValue) : null;
                a.rawValue = newIdx; a.dataType = TYPE_STRING; a.data = newIdx; a.valueSize = 8; a.res0 = 0;
                return prev;
            }
        }
        // insert new android:name attribute (append; runtime matches by resource id, order-free)
        Attr a = new Attr();
        a.ns = nsIdx; a.name = nameIdx; a.rawValue = newIdx;
        a.dataType = TYPE_STRING; a.data = newIdx; a.valueSize = 8; a.res0 = 0;
        app.attrs.add(a);
        if (app.classIndex == 0xFFFF || app.classIndex == 0) { /* leave positional hints */ }
        return null;
    }

    // ================= serialisation =================

    public byte[] build() {
        byte[] pool = buildStringPool();
        byte[] resmap = buildResourceMap();
        byte[] body = buildNodes();

        int total = 8 + pool.length + resmap.length + body.length;
        ByteArrayOutputStream out = new ByteArrayOutputStream(total);
        Writer w = new Writer(out);
        w.u16(RES_XML_TYPE); w.u16(8); w.u32(total);
        w.bytes(pool); w.bytes(resmap); w.bytes(body);
        return out.toByteArray();
    }

    private byte[] buildStringPool() {
        // encode strings
        ByteArrayOutputStream data = new ByteArrayOutputStream();
        int[] offsets = new int[strings.size()];
        for (int i = 0; i < strings.size(); i++) {
            offsets[i] = data.size();
            encodeString(data, strings.get(i));
        }
        // pad string data to 4 bytes
        while (data.size() % 4 != 0) data.write(0);
        byte[] dataBytes = data.toByteArray();

        int headerSize = 28;
        int offsetsSize = strings.size() * 4;
        int stringsStart = headerSize + offsetsSize;
        int size = stringsStart + dataBytes.length;

        ByteArrayOutputStream out = new ByteArrayOutputStream(size);
        Writer w = new Writer(out);
        w.u16(RES_STRING_POOL_TYPE); w.u16(headerSize); w.u32(size);
        w.u32(strings.size()); w.u32(0); w.u32(poolFlags);
        w.u32(stringsStart); w.u32(0);
        for (int off : offsets) w.u32(off);
        w.bytes(dataBytes);
        return out.toByteArray();
    }

    private void encodeString(ByteArrayOutputStream out, String s) {
        if (utf8) {
            byte[] u8 = s.getBytes(StandardCharsets.UTF_8);
            writeLen8(out, s.length());   // utf16 length (char count)
            writeLen8(out, u8.length);    // utf8 byte length
            out.write(u8, 0, u8.length);
            out.write(0);
        } else {
            int len = s.length();
            if (len > 0x7FFF) {
                out.write((0x8000 | (len >> 16)) & 0xFF); out.write((len >> 24) & 0xFF); // rare
                out.write(len & 0xFF); out.write((len >> 8) & 0xFF);
            } else {
                out.write(len & 0xFF); out.write((len >> 8) & 0xFF);
            }
            byte[] u16 = s.getBytes(StandardCharsets.UTF_16LE);
            out.write(u16, 0, u16.length);
            out.write(0); out.write(0);
        }
    }

    private static void writeLen8(ByteArrayOutputStream out, int len) {
        if (len > 0x7F) {
            out.write(((len >> 8) | 0x80) & 0xFF);
            out.write(len & 0xFF);
        } else {
            out.write(len & 0xFF);
        }
    }

    private byte[] buildResourceMap() {
        if (resourceMap.length == 0) return new byte[0];
        int size = 8 + resourceMap.length * 4;
        ByteArrayOutputStream out = new ByteArrayOutputStream(size);
        Writer w = new Writer(out);
        w.u16(RES_XML_RESOURCE_MAP_TYPE); w.u16(8); w.u32(size);
        for (long id : resourceMap) w.u32((int) id);
        return out.toByteArray();
    }

    private byte[] buildNodes() {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Writer w = new Writer(out);
        for (Node n : nodes) {
            switch (n.type) {
                case RES_XML_START_NAMESPACE:
                case RES_XML_END_NAMESPACE:
                    w.u16(n.type); w.u16(16); w.u32(24);
                    w.u32(n.lineNumber); w.u32(n.comment);
                    w.u32(n.nsPrefix); w.u32(n.nsUri);
                    break;
                case RES_XML_START_ELEMENT: {
                    int size = 16 + 20 + n.attrs.size() * 20;
                    w.u16(n.type); w.u16(16); w.u32(size);
                    w.u32(n.lineNumber); w.u32(n.comment);
                    w.u32(n.ns); w.u32(n.name);
                    w.u16(20); w.u16(20);
                    w.u16(n.attrs.size());
                    w.u16(n.idIndex); w.u16(n.classIndex); w.u16(n.styleIndex);
                    for (Attr a : n.attrs) {
                        w.u32(a.ns); w.u32(a.name); w.u32(a.rawValue);
                        w.u16(a.valueSize & 0xFFFF); w.u8(a.res0 & 0xFF);
                        w.u8(a.dataType); w.u32(a.data);
                    }
                    break;
                }
                case RES_XML_END_ELEMENT:
                    w.u16(n.type); w.u16(16); w.u32(24);
                    w.u32(n.lineNumber); w.u32(n.comment);
                    w.u32(n.ns); w.u32(n.name);
                    break;
                case RES_XML_CDATA:
                    w.u16(n.type); w.u16(16); w.u32(28);
                    w.u32(n.lineNumber); w.u32(n.comment);
                    w.u32(n.cdataRaw);
                    w.u16(8); w.u8(0); w.u8(n.cdataType); w.u32(n.cdataData);
                    break;
                default:
                    break;
            }
        }
        return out.toByteArray();
    }

    // ================= little-endian IO =================

    private static int u16le(byte[] b, int p) { return (b[p] & 0xFF) | ((b[p + 1] & 0xFF) << 8); }

    private static final class Cursor {
        final byte[] b; int pos;
        Cursor(byte[] b, int pos) { this.b = b; this.pos = pos; }
        int u8() { return b[pos++] & 0xFF; }
        int u16() { int v = (b[pos] & 0xFF) | ((b[pos + 1] & 0xFF) << 8); pos += 2; return v; }
        long u32() { long v = (b[pos] & 0xFFL) | ((b[pos + 1] & 0xFFL) << 8) | ((b[pos + 2] & 0xFFL) << 16) | ((b[pos + 3] & 0xFFL) << 24); pos += 4; return v; }
        int u32s() { return (int) u32(); } // signed-ish ref (0xFFFFFFFF -> -1)
    }

    private static final class Writer {
        final ByteArrayOutputStream o;
        Writer(ByteArrayOutputStream o) { this.o = o; }
        void u8(int v) { o.write(v & 0xFF); }
        void u16(int v) { o.write(v & 0xFF); o.write((v >> 8) & 0xFF); }
        void u32(long v) { o.write((int) (v & 0xFF)); o.write((int) ((v >> 8) & 0xFF)); o.write((int) ((v >> 16) & 0xFF)); o.write((int) ((v >> 24) & 0xFF)); }
        void bytes(byte[] b) { o.write(b, 0, b.length); }
    }
}
