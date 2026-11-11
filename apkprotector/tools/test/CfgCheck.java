package com.protector.test;
import com.protector.app.engine.*;
import java.io.*; import java.util.zip.*; import org.json.*;
public class CfgCheck {
  public static void main(String[] a) throws Exception {
    // signer cert sha256 (hex) + package as the shell would compute them
    byte[] certSha = hex(a[1]);
    String pkg = a[2];
    byte[] wrap = PrtFormat.wrapKey(certSha, pkg);
    byte[] cbin=null;
    try (ZipFile z=new ZipFile(a[0])) {
      ZipEntry e=z.getEntry("prt/c.bin");
      try(InputStream in=z.getInputStream(e)){ ByteArrayOutputStream b=new ByteArrayOutputStream(); byte[] t=new byte[4096]; int n; while((n=in.read(t))!=-1)b.write(t,0,n); cbin=b.toByteArray(); }
    }
    byte[] json = Crypto.decrypt(wrap, cbin);
    JSONObject cfg=new JSONObject(new String(json,"UTF-8"));
    System.out.println("DECRYPT OK. config keys: app='"+cfg.getString("app")+"' dn="+cfg.getInt("dn")+" ln="+cfg.getInt("ln")+" flags="+cfg.getJSONObject("f"));
    System.out.println("dexKey present: "+(cfg.getString("dk").length()>0));
    // now test the anti-repackaging lock: wrong cert -> must fail
    byte[] wrongCert = certSha.clone(); wrongCert[0]^=0xFF;
    try { Crypto.decrypt(PrtFormat.wrapKey(wrongCert,pkg), cbin); System.out.println("LOCK FAIL: decrypt succeeded with wrong signer!"); }
    catch(Exception ex){ System.out.println("ANTI-REPACKAGING LOCK OK: wrong signer cert -> decryption rejected ("+ex.getClass().getSimpleName()+")"); }
  }
  static byte[] hex(String s){ byte[] b=new byte[s.length()/2]; for(int i=0;i<b.length;i++)b[i]=(byte)Integer.parseInt(s.substring(2*i,2*i+2),16); return b; }
}
