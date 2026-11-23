package pro.hooje.mylogue;

import android.content.Context;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// 4.17.0 앱 → 위젯 요약 전달. 글자 두 줄만 받고 길이를 자른다(건강 수치 원본은 넘기지 않는다).
@CapacitorPlugin(name = "MylogueWidget")
public class WidgetPlugin extends Plugin {
    @PluginMethod
    public void update(PluginCall call) {
        String title = cut(call.getString("title", "오늘의 마이로그"), 40);
        String line = cut(call.getString("line", ""), 120);
        getContext().getSharedPreferences(TodayWidget.PREFS, Context.MODE_PRIVATE).edit()
            .putString("title", title).putString("line", line).apply();
        TodayWidget.refresh(getContext());
        call.resolve();
    }

    private static String cut(String s, int n) { if (s == null) return ""; return s.length() > n ? s.substring(0, n) : s; }
}
