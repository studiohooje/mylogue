package pro.hooje.mylogue;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

// 4.17.0 홈 화면 위젯: 오늘 한 줄(앱이 마지막으로 남긴 요약)과 체중·식단·운동 바로 기록 버튼.
// 요약은 앱을 열 때 WidgetPlugin.update로만 바뀐다(위젯이 기록을 직접 읽지 않는다).
public class TodayWidget extends AppWidgetProvider {
    static final String PREFS = "mylogue.widget";

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) mgr.updateAppWidget(id, views(ctx));
    }

    static void refresh(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, TodayWidget.class));
        for (int id : ids) mgr.updateAppWidget(id, views(ctx));
    }

    static RemoteViews views(Context ctx) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_today);
        v.setTextViewText(R.id.widget_title, p.getString("title", "오늘의 마이로그"));
        v.setTextViewText(R.id.widget_line, p.getString("line", "앱을 한 번 열면 오늘 기록이 여기에 보여요"));
        v.setOnClickPendingIntent(R.id.widget_root, open(ctx, "mylogue://record/home", 10));
        v.setOnClickPendingIntent(R.id.widget_body, open(ctx, "mylogue://record/body", 11));
        v.setOnClickPendingIntent(R.id.widget_meal, open(ctx, "mylogue://record/meal", 12));
        v.setOnClickPendingIntent(R.id.widget_workout, open(ctx, "mylogue://record/workout", 13));
        return v;
    }

    static PendingIntent open(Context ctx, String uri, int code) {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(uri), ctx, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(ctx, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
