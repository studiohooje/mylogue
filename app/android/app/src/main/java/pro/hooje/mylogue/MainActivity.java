package pro.hooje.mylogue;

import com.getcapacitor.BridgeActivity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import android.os.Build;
import org.json.JSONObject;
import android.os.Bundle;
import android.view.WindowInsetsController;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetPlugin.class);
        registerPlugin(HealthPlugin.class);
        super.onCreate(savedInstanceState);
        useLightStatusBarIcons(false);
        deliverShare(getIntent(), 1500);
        deliverShortcut(getIntent(), 1500);
    }

    // 3.16.0 다른 앱(ChatGPT 등)에서 '공유 → 마이로그'로 보낸 글을 AI 입력 창으로 넘긴다.
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        deliverShare(intent, 300);
        deliverShortcut(intent, 300);
    }

    // 4.7.0 앱 바로가기: mylogue://record/body|meal|workout → 그 기록 창을 연다
    private void deliverShortcut(Intent intent, long delayMs) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction()) || intent.getData() == null) return;
        Uri u = intent.getData();
        if (!"mylogue".equals(u.getScheme())) return;
        String kind = u.getLastPathSegment();
        if (kind == null || !kind.matches("body|meal|workout") || getBridge() == null || getBridge().getWebView() == null) return;
        intent.setData(null);
        getBridge().getWebView().postDelayed(() -> getBridge().getWebView().evaluateJavascript(
            "(function(k){try{localStorage.setItem('mylogue.pendingShortcut',k)}catch(e){}" +
            "window.dispatchEvent(new CustomEvent('mylogue-shortcut',{detail:k}));})('" + kind + "')", null), delayMs);
    }

    // 4.7.0 사진 공유(인바디 결과지): 12MB까지 읽어 data URL로 앱에 넘긴다
    private void deliverImage(Intent intent, long delayMs) {
        Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        // 보안 점검(2026-11-22): 다른 앱이 file:// 로 앱 내부 파일을 넘기지 못하게 content:// 이미지만 받는다
        if (uri == null || !"content".equals(uri.getScheme()) || getBridge() == null || getBridge().getWebView() == null) return;
        String mt = getContentResolver().getType(uri);
        if (mt == null || !mt.startsWith("image/")) return;
        try (InputStream in = getContentResolver().openInputStream(uri)) {
            if (in == null) return;
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[65536]; int n, total = 0;
            while ((n = in.read(buf)) > 0) { total += n; if (total > 12 * 1024 * 1024) return; out.write(buf, 0, n); }
            String type = mt;
            String url = "data:" + type + ";base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
            intent.removeExtra(Intent.EXTRA_STREAM);
            getBridge().getWebView().postDelayed(() -> getBridge().getWebView().evaluateJavascript(
                "(function(t){window.__mylogueSharedImage=t;window.dispatchEvent(new CustomEvent('mylogue-share-image',{detail:t}));})(" + JSONObject.quote(url) + ")", null), delayMs);
        } catch (Exception e) { /* 읽지 못하면 조용히 넘어간다 */ }
    }

    private void deliverShare(Intent intent, long delayMs) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return;
        if (intent.getType() != null && intent.getType().startsWith("image/")) { deliverImage(intent, delayMs); return; }
        String text = intent.getStringExtra(Intent.EXTRA_TEXT);
        if (text == null || text.trim().isEmpty() || getBridge() == null || getBridge().getWebView() == null) return;
        if (text.length() > 20000) text = text.substring(0, 20000);
        String quoted = JSONObject.quote(text);
        intent.removeExtra(Intent.EXTRA_TEXT);
        getBridge().getWebView().postDelayed(() -> getBridge().getWebView().evaluateJavascript(
            "(function(t){try{localStorage.setItem('mylogue.pendingShare',t)}catch(e){}" +
            "window.dispatchEvent(new CustomEvent('mylogue-share',{detail:t}));})(" + quoted + ")", null), delayMs);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) useLightStatusBarIcons(false);
    }

    @Override
    public void onResume() {
        super.onResume();
        if (getBridge() == null || getBridge().getWebView() == null) return;
        getBridge().getWebView().postDelayed(() -> getBridge().getWebView().evaluateJavascript(
            "(async()=>{if(sessionStorage.getItem('mw-native-cache-cleaned'))return;" +
            "sessionStorage.setItem('mw-native-cache-cleaned','1');" +
            "if(!('serviceWorker' in navigator))return;" +
            "const registrations=await navigator.serviceWorker.getRegistrations();" +
            "const keys=await caches.keys();" +
            "if(!registrations.length&&!keys.some(k=>k.startsWith('mylogue-')))return;" +
            "await Promise.all(registrations.map(r=>r.unregister()));" +
            "await Promise.all(keys.filter(k=>k.startsWith('mylogue-')).map(k=>caches.delete(k)));" +
            "location.reload();})().catch(console.error)", null), 1500);
    }

    private void useLightStatusBarIcons(boolean enabled) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().getInsetsController().setSystemBarsAppearance(
                enabled ? WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS : 0,
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS);
        }
    }
}
