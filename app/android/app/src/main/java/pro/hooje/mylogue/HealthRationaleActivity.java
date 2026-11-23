package pro.hooje.mylogue;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

// 4.17.0 헬스 커넥트 권한 화면의 '개인정보 처리방침' 링크: 공개 처리방침의 건강정보 항목을 연다.
public class HealthRationaleActivity extends Activity {
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://studiohooje.github.io/mylogue/privacy.html#health"))); } catch (Exception ignored) {}
        finish();
    }
}
