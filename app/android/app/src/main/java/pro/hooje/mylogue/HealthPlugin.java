package pro.hooje.mylogue;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.activity.result.ActivityResult;
import androidx.health.connect.client.HealthConnectClient;
import androidx.health.connect.client.PermissionController;
import androidx.health.connect.client.permission.HealthPermission;
import androidx.health.connect.client.records.StepsRecord;
import androidx.health.connect.client.records.WeightRecord;
import androidx.health.connect.client.request.ReadRecordsRequest;
import androidx.health.connect.client.response.ReadRecordsResponse;
import androidx.health.connect.client.time.TimeRangeFilter;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import kotlin.coroutines.EmptyCoroutineContext;
import kotlin.jvm.JvmClassMappingKt;
import kotlinx.coroutines.BuildersKt;

// 4.17.0 헬스 커넥트(삼성 헬스 등) 준비: 걸음 수와 체중을 읽기만 한다. 쓰기 권한은 요청하지 않는다.
// 읽은 값은 앱에서 미리보기로 보여 주고, 사람이 확정해야 기록이 된다(대표님 방침 2026-11-22).
@CapacitorPlugin(name = "MylogueHealth")
public class HealthPlugin extends Plugin {
    static final String PKG = "com.google.android.apps.healthdata";

    static String stepsPerm() { return HealthPermission.getReadPermission(JvmClassMappingKt.getKotlinClass(StepsRecord.class)); }
    static String weightPerm() { return HealthPermission.getReadPermission(JvmClassMappingKt.getKotlinClass(WeightRecord.class)); }

    static Set<String> perms() {
        Set<String> s = new HashSet<>();
        s.add(stepsPerm());
        s.add(weightPerm());
        return s;
    }

    private String status(Context ctx) {
        if (Build.VERSION.SDK_INT < 26) return "unsupported";
        int st = HealthConnectClient.getSdkStatus(ctx, PKG);
        if (st == HealthConnectClient.SDK_AVAILABLE) return "available";
        if (st == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return "update";
        return "unavailable";
    }

    @PluginMethod
    public void availability(PluginCall call) {
        JSObject r = new JSObject();
        r.put("status", status(getContext()));
        call.resolve(r);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (!"available".equals(status(getContext()))) { call.reject("헬스 커넥트를 쓸 수 없어요"); return; }
        Intent i = PermissionController.createRequestPermissionResultContract(PKG).createIntent(getContext(), perms());
        startActivityForResult(call, i, "permissionResult");
    }

    @ActivityCallback
    private void permissionResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        new Thread(() -> {
            try { call.resolve(granted()); } catch (Exception e) { call.reject("권한 확인 실패", e); }
        }).start();
    }

    @SuppressWarnings("unchecked")
    private JSObject granted() throws InterruptedException {
        HealthConnectClient c = HealthConnectClient.getOrCreate(getContext(), PKG);
        Set<String> g = (Set<String>) BuildersKt.runBlocking(EmptyCoroutineContext.INSTANCE,
            (scope, cont) -> c.getPermissionController().getGrantedPermissions(cont));
        JSObject r = new JSObject();
        r.put("steps", g.contains(stepsPerm()));
        r.put("weight", g.contains(weightPerm()));
        return r;
    }

    @PluginMethod
    public void permissions(PluginCall call) {
        if (!"available".equals(status(getContext()))) {
            JSObject r = new JSObject(); r.put("steps", false); r.put("weight", false); call.resolve(r); return;
        }
        new Thread(() -> { try { call.resolve(granted()); } catch (Exception e) { call.reject("권한 확인 실패", e); } }).start();
    }

    // 최근 days일(최대 30일)의 날짜별 걸음 합계와 체중 측정값
    @PluginMethod
    public void read(PluginCall call) {
        if (!"available".equals(status(getContext()))) { call.reject("헬스 커넥트를 쓸 수 없어요"); return; }
        int days = Math.max(1, Math.min(30, call.getInt("days", 7)));
        new Thread(() -> {
            try {
                HealthConnectClient c = HealthConnectClient.getOrCreate(getContext(), PKG);
                ZoneId zone = ZoneId.systemDefault();
                Instant end = Instant.now();
                Instant start = LocalDate.now(zone).minusDays(days - 1).atStartOfDay(zone).toInstant();
                TimeRangeFilter range = TimeRangeFilter.between(start, end);
                Map<String, Long> steps = new TreeMap<>();
                ReadRecordsRequest<StepsRecord> sr = new ReadRecordsRequest<>(JvmClassMappingKt.getKotlinClass(StepsRecord.class), range, new HashSet<>(), true, 5000, null);
                @SuppressWarnings("unchecked")
                ReadRecordsResponse<StepsRecord> sres = (ReadRecordsResponse<StepsRecord>) BuildersKt.runBlocking(EmptyCoroutineContext.INSTANCE, (scope, cont) -> c.readRecords(sr, cont));
                for (StepsRecord s : sres.getRecords()) {
                    String d = s.getStartTime().atZone(zone).toLocalDate().toString();
                    steps.merge(d, s.getCount(), Long::sum);
                }
                JSArray stepArr = new JSArray();
                for (Map.Entry<String, Long> e : steps.entrySet()) {
                    JSObject o = new JSObject(); o.put("date", e.getKey()); o.put("steps", e.getValue()); stepArr.put(o);
                }
                ReadRecordsRequest<WeightRecord> wr = new ReadRecordsRequest<>(JvmClassMappingKt.getKotlinClass(WeightRecord.class), range, new HashSet<>(), true, 1000, null);
                @SuppressWarnings("unchecked")
                ReadRecordsResponse<WeightRecord> wres = (ReadRecordsResponse<WeightRecord>) BuildersKt.runBlocking(EmptyCoroutineContext.INSTANCE, (scope, cont) -> c.readRecords(wr, cont));
                JSArray wArr = new JSArray();
                for (WeightRecord w : wres.getRecords()) {
                    JSObject o = new JSObject();
                    o.put("date", w.getTime().atZone(zone).toLocalDate().toString());
                    o.put("time", w.getTime().truncatedTo(ChronoUnit.SECONDS).toString());
                    o.put("weight", Math.round(w.getWeight().getKilograms() * 10) / 10.0);
                    o.put("origin", w.getMetadata().getDataOrigin().getPackageName());
                    wArr.put(o);
                }
                JSObject r = new JSObject(); r.put("steps", stepArr); r.put("weights", wArr); call.resolve(r);
            } catch (Exception e) { call.reject("읽기 실패", e); }
        }).start();
    }
}
