package sk.kinematika.studio;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.*;
import androidx.webkit.WebViewAssetLoader;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private WebView web;
    private ValueCallback<Uri[]> chooser;
    private byte[] pendingExport;
    private static final int OPEN=1, SAVE=2;
    private static boolean local(Uri uri) { return "https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost()) && uri.getPath().startsWith("/assets/"); }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web=new WebView(this); setContentView(web);
        web.getSettings().setJavaScriptEnabled(true); web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false); web.getSettings().setAllowContentAccess(true);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        final WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) { return loader.shouldInterceptRequest(request.getUrl()); }
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request) {
                Uri uri=request.getUrl(); if(local(uri)) return false;
                if("https".equals(uri.getScheme())) { try { startActivity(new Intent(Intent.ACTION_VIEW,uri)); } catch(Exception ignored) {} }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params) {
                if(chooser!=null) chooser.onReceiveValue(null); chooser=callback;
                Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                try { startActivityForResult(intent,OPEN); return true; } catch(Exception error) { chooser=null; return false; }
            }
            @Override public boolean onJsAlert(WebView view,String url,String message,JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("OK",(d,w)->result.confirm()).setOnCancelListener(d->result.cancel()).show();return true;
            }
        });
        web.addJavascriptInterface(new Files(),"KinmoNativeFiles");
        if(state!=null) web.restoreState(state); else web.loadUrl("https://appassets.androidplatform.net/assets/index.html");
    }
    private class Files {
        @JavascriptInterface public String platform() { return "android"; }
        @JavascriptInterface public String version() { return BuildConfig.VERSION_NAME; }
        @JavascriptInterface public void saveFile(String name,String encoded,String mime) {
            if(encoded.length()>45*1024*1024) return;
            final byte[] data; try { data=Base64.decode(encoded,Base64.DEFAULT); } catch(Exception error) { return; }
            if(data.length>32*1024*1024) return;
            runOnUiThread(()-> {
                if(pendingExport!=null) { new AlertDialog.Builder(MainActivity.this).setMessage("Najskôr dokončite otvorené ukladanie súboru.").setPositiveButton("OK",null).show();return; }
                pendingExport=data;
                Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(mime).putExtra(Intent.EXTRA_TITLE,name.replaceAll("[\\\\/:]","_"));
                try { startActivityForResult(intent,SAVE); } catch(Exception error) { pendingExport=null; showError(error); }
            });
        }
    }
    private void showError(Exception error) { new AlertDialog.Builder(this).setMessage("Súbor sa nepodarilo uložiť: "+error.getMessage()).setPositiveButton("OK",null).show(); }
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if(request==OPEN && chooser!=null) { chooser.onReceiveValue(result==RESULT_OK && data!=null ? new Uri[]{data.getData()} : null);chooser=null; }
        if(request==SAVE) { byte[] bytes=pendingExport;pendingExport=null;if(result==RESULT_OK && data!=null && bytes!=null) { try(OutputStream stream=getContentResolver().openOutputStream(data.getData())) { if(stream==null) throw new Exception("Úložisko nie je dostupné");stream.write(bytes); } catch(Exception error) { showError(error); } } }
    }
    @Override protected void onSaveInstanceState(Bundle out) { web.saveState(out);super.onSaveInstanceState(out); }
    @Override public void onBackPressed() { if(web.canGoBack()) web.goBack(); else super.onBackPressed(); }
    @Override protected void onDestroy() { if(chooser!=null) chooser.onReceiveValue(null);web.removeJavascriptInterface("KinmoNativeFiles");web.destroy();super.onDestroy(); }
}
