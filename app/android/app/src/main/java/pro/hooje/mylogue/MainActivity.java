package pro.hooje.mylogue;

import com.getcapacitor.BridgeActivity;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowInsetsController;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        useLightStatusBarIcons(false);
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
