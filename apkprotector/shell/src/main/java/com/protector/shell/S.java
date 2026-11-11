package com.protector.shell;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** Encrypted string table (generated). Hides loader internals from static analysis. */
final class S {
    private static final byte[] SEED = {(byte)90,(byte)195,(byte)25,(byte)231};
    static final int FORNAME = 0;
    static final int GETDECLMETHOD = 1;
    static final int VMRUNTIME = 2;
    static final int GETRUNTIME = 3;
    static final int SETEXEMPT = 4;
    static final int LPREFIX = 5;
    static final int ACTIVITYTHREAD = 6;
    static final int CURRENTAT = 7;
    static final int MINITIALAPP = 8;
    static final int MALLAPPS = 9;
    static final int MBOUNDAPP = 10;
    static final int INFO = 11;
    static final int MAPPLICATION = 12;
    static final int MAPPINFO = 13;
    static final int ATTACH = 14;
    static final int PATHLIST = 15;
    static final int DEXELEMENTS = 16;
    static final int NATIVEDIRS = 17;
    static final int NATIVEELEMS = 18;
    static final int DEXPATHELEM = 19;
    static final int DEXFILE = 20;
    static final int PRTLIB = 21;
    static final int PROC_STATUS = 22;
    static final int TRACERPID = 23;
    static final int PROC_MAPS = 24;
    static final int PROC_TASK = 25;
    static final int COMM = 26;
    static final int FRIDA = 27;
    static final int GUMJS = 28;
    static final int GMAIN = 29;
    static final int LINJECTOR = 30;
    static final int FRIDA_AGENT = 31;
    static final int FRIDA_GADGET = 32;
    static final int GADGET = 33;
    static final int LIBFRIDA = 34;
    static final int GDBUS = 35;
    static final int GUM = 36;
    static final int LIBGADGET = 37;
    static final int GUMJS2 = 38;
    static final int LOCALHOST = 39;
    static final int PRT = 40;
    static final int PRT_CFG = 41;
    static final int PRT_D = 42;
    static final int PRT_N = 43;

    private static final byte[][] T = {
        {(byte)81,(byte)93,(byte)27,(byte)144,(byte)20,(byte)178,(byte)145},
        {(byte)221,(byte)97,(byte)6,(byte)164,(byte)136,(byte)43,(byte)70,(byte)55,(byte)40,(byte)247,(byte)100,(byte)216,(byte)108,(byte)1,(byte)26,(byte)119,(byte)0},
        {(byte)212,(byte)33,(byte)130,(byte)175,(byte)62,(byte)8,(byte)241,(byte)62,(byte)232,(byte)80,(byte)60,(byte)241,(byte)0,(byte)58,(byte)245,(byte)57,(byte)58,(byte)234,(byte)79,(byte)202,(byte)122,(byte)25,(byte)68},
        {(byte)222,(byte)6,(byte)165,(byte)74,(byte)98,(byte)47,(byte)33,(byte)198,(byte)209,(byte)96},
        {(byte)252,(byte)17,(byte)240,(byte)47,(byte)178,(byte)213,(byte)121,(byte)60,(byte)130,(byte)3,(byte)192,(byte)202,(byte)12,(byte)151,(byte)231,(byte)17,(byte)175,(byte)203,(byte)195,(byte)208,(byte)53,(byte)198},
        {(byte)164},
        {(byte)174,(byte)193,(byte)202,(byte)59,(byte)112,(byte)240,(byte)210,(byte)58,(byte)26,(byte)165,(byte)141,(byte)110,(byte)235,(byte)40,(byte)138,(byte)28,(byte)193,(byte)23,(byte)141,(byte)183,(byte)162,(byte)252,(byte)15,(byte)198,(byte)208,(byte)255},
        {(byte)24,(byte)128,(byte)70,(byte)54,(byte)56,(byte)82,(byte)78,(byte)252,(byte)37,(byte)254,(byte)110,(byte)10,(byte)137,(byte)8,(byte)213,(byte)230,(byte)40,(byte)110,(byte)223,(byte)120,(byte)241},
        {(byte)93,(byte)174,(byte)145,(byte)124,(byte)200,(byte)231,(byte)244,(byte)253,(byte)207,(byte)7,(byte)158,(byte)240,(byte)62,(byte)172,(byte)152,(byte)95,(byte)11,(byte)20,(byte)96},
        {(byte)34,(byte)20,(byte)81,(byte)73,(byte)42,(byte)240,(byte)32,(byte)201,(byte)54,(byte)206,(byte)241,(byte)98,(byte)94,(byte)83,(byte)169,(byte)52},
        {(byte)139,(byte)79,(byte)59,(byte)197,(byte)134,(byte)235,(byte)57,(byte)27,(byte)208,(byte)134,(byte)157,(byte)163,(byte)21,(byte)96,(byte)30,(byte)41,(byte)202},
        {(byte)192,(byte)180,(byte)156,(byte)133},
        {(byte)234,(byte)39,(byte)212,(byte)250,(byte)109,(byte)248,(byte)208,(byte)164,(byte)90,(byte)253,(byte)111,(byte)72},
        {(byte)54,(byte)55,(byte)204,(byte)36,(byte)36,(byte)53,(byte)1,(byte)22,(byte)180,(byte)139,(byte)78,(byte)164,(byte)26,(byte)84,(byte)236,(byte)242},
        {(byte)189,(byte)31,(byte)144,(byte)52,(byte)230,(byte)231},
        {(byte)98,(byte)192,(byte)181,(byte)133,(byte)36,(byte)221,(byte)68,(byte)226},
        {(byte)52,(byte)30,(byte)218,(byte)255,(byte)15,(byte)188,(byte)183,(byte)92,(byte)68,(byte)87,(byte)216},
        {(byte)146,(byte)243,(byte)203,(byte)37,(byte)23,(byte)192,(byte)223,(byte)164,(byte)40,(byte)136,(byte)138,(byte)205,(byte)17,(byte)211,(byte)205,(byte)94,(byte)66,(byte)81,(byte)32,(byte)90,(byte)228,(byte)10,(byte)255,(byte)191},
        {(byte)79,(byte)52,(byte)241,(byte)34,(byte)213,(byte)69,(byte)104,(byte)252,(byte)238,(byte)221,(byte)245,(byte)115,(byte)144,(byte)217,(byte)10,(byte)159,(byte)253,(byte)117,(byte)204,(byte)103,(byte)178,(byte)157,(byte)112,(byte)187,(byte)125},
        {(byte)243,(byte)110,(byte)117,(byte)130,(byte)195,(byte)202,(byte)205,(byte)60,(byte)247,(byte)227,(byte)65,(byte)113,(byte)26,(byte)225,(byte)68,(byte)252,(byte)54,(byte)98,(byte)95,(byte)194,(byte)81,(byte)213,(byte)35,(byte)210,(byte)236,(byte)150,(byte)35,(byte)228,(byte)170,(byte)132,(byte)177,(byte)233,(byte)243},
        {(byte)213,(byte)90,(byte)40,(byte)51,(byte)73,(byte)52,(byte)83,(byte)4,(byte)99,(byte)28,(byte)166,(byte)47,(byte)115,(byte)216,(byte)234,(byte)209,(byte)225,(byte)58,(byte)113,(byte)67,(byte)88},
        {(byte)209,(byte)13,(byte)113,(byte)197,(byte)134,(byte)70,(byte)137},
        {(byte)39,(byte)123,(byte)122,(byte)122,(byte)118,(byte)34,(byte)247,(byte)171,(byte)204,(byte)87,(byte)230,(byte)11,(byte)122,(byte)25,(byte)14,(byte)36,(byte)43},
        {(byte)106,(byte)145,(byte)142,(byte)77,(byte)224,(byte)169,(byte)145,(byte)18,(byte)159,(byte)151},
        {(byte)215,(byte)143,(byte)149,(byte)141,(byte)185,(byte)238,(byte)23,(byte)207,(byte)250,(byte)238,(byte)83,(byte)156,(byte)175,(byte)51,(byte)84},
        {(byte)240,(byte)215,(byte)254,(byte)181,(byte)9,(byte)227,(byte)156,(byte)175,(byte)247,(byte)233,(byte)179,(byte)198,(byte)13,(byte)90,(byte)76},
        {(byte)43,(byte)14,(byte)199,(byte)71},
        {(byte)20,(byte)104,(byte)204,(byte)100,(byte)35},
        {(byte)70,(byte)107,(byte)226,(byte)135,(byte)128,(byte)238,(byte)152,(byte)25,(byte)93,(byte)139,(byte)219},
        {(byte)3,(byte)221,(byte)28,(byte)99,(byte)199},
        {(byte)5,(byte)38,(byte)188,(byte)132,(byte)31,(byte)216,(byte)206,(byte)145,(byte)118},
        {(byte)69,(byte)71,(byte)161,(byte)124,(byte)70,(byte)230,(byte)138,(byte)89,(byte)144,(byte)208,(byte)86},
        {(byte)73,(byte)24,(byte)186,(byte)172,(byte)210,(byte)242,(byte)155,(byte)178,(byte)176,(byte)204,(byte)155,(byte)96},
        {(byte)126,(byte)110,(byte)181,(byte)40,(byte)60,(byte)123},
        {(byte)176,(byte)134,(byte)12,(byte)78,(byte)136,(byte)91,(byte)216,(byte)192},
        {(byte)10,(byte)92,(byte)136,(byte)232,(byte)197},
        {(byte)253,(byte)75,(byte)129},
        {(byte)42,(byte)133,(byte)34,(byte)98,(byte)61,(byte)182,(byte)193,(byte)60,(byte)201},
        {(byte)207,(byte)170,(byte)246,(byte)235,(byte)113,(byte)234},
        {(byte)19,(byte)35,(byte)119,(byte)7,(byte)249,(byte)2,(byte)101,(byte)181,(byte)105},
        {(byte)34,(byte)95,(byte)228},
        {(byte)64,(byte)198,(byte)147,(byte)218,(byte)53,(byte)9,(byte)99,(byte)22,(byte)164},
        {(byte)108,(byte)155,(byte)223,(byte)152,(byte)31},
        {(byte)253,(byte)125,(byte)209,(byte)193,(byte)245},
    };

    static String g(int i) {
        byte[] c = T[i];
        byte[] ks = ks(i, c.length);
        byte[] o = new byte[c.length];
        for (int j = 0; j < c.length; j++) o[j] = (byte) (c[j] ^ ks[j]);
        return new String(o, StandardCharsets.UTF_8);
    }

    private static byte[] ks(int i, int len) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(SEED);
            md.update((byte) i); md.update((byte) (i >> 8)); md.update((byte) (i >> 16)); md.update((byte) (i >> 24));
            byte[] block = md.digest();
            byte[] out = new byte[len];
            int p = 0;
            while (p < len) {
                int n = Math.min(32, len - p);
                System.arraycopy(block, 0, out, p, n);
                p += n;
                if (p < len) { md.reset(); block = md.digest(block); }
            }
            return out;
        } catch (Exception e) { throw new RuntimeException(e); }
    }
    private S() {}
}
