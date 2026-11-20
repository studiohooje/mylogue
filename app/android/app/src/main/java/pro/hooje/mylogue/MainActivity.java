package pro.hooje.mylogue;

import com.getcapacitor.BridgeActivity;
import android.content.Intent;
import android.os.Build;
import org.json.JSONObject;
import android.os.Bundle;
import android.view.WindowInsetsController;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        useLightStatusBarIcons(false);
        deliverShare(getIntent(), 1500);
    }

    // 3.16.0 다른 앱(ChatGPT 등)에서 '공유 → 마이로그'로 보낸 글을 AI 입력 창으로 넘긴다.
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        deliverShare(intent, 300);
    }

    private void deliverShare(Intent intent, long delayMs) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return;
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
