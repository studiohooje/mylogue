package pro.hooje.mylogue;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

// 4.27.0 전수검사 AA-01: 웹뷰에는 <a download> 처리기가 없어 APK에서 백업·내보내기 파일이 실제로 저장되지 않았다.
// 글(JSON·텍스트)을 받아 Android 10 이상은 '다운로드/Mylogue'(권한 필요 없음), 그 아래는 앱 전용 문서 폴더에 저장한다.
@CapacitorPlugin(name = "MylogueFileSave")
public class FileSavePlugin extends Plugin {
    @PluginMethod
    public void save(PluginCall call) {
        String name = call.getString("name", "mylogue.json").replaceAll("[\\\\/:*?\"<>|\\n\\r]", "_");
        if (name.length() > 120) name = name.substring(0, 120);
        String mime = call.getString("mime", "application/json");
        byte[] bytes = call.getString("data", "").getBytes(StandardCharsets.UTF_8);
        try {
            String where;
            if (Build.VERSION.SDK_INT >= 29) {
                ContentResolver resolver = getContext().getContentResolver();
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, name);
                values.put(MediaStore.Downloads.MIME_TYPE, mime);
                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Mylogue");
                values.put(MediaStore.Downloads.IS_PENDING, 1);
                Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) throw new Exception("저장할 자리를 만들지 못했어요");
                try (OutputStream out = resolver.openOutputStream(uri)) {
                    if (out == null) throw new Exception("파일을 열지 못했어요");
                    out.write(bytes);
                }
                values.clear();
                values.put(MediaStore.Downloads.IS_PENDING, 0);
                resolver.update(uri, values, null, null);
                where = "다운로드/Mylogue/" + name;
            } else {
                File dir = getContext().getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS);
                if (dir == null) throw new Exception("저장 공간을 찾지 못했어요");
                if (!dir.exists() && !dir.mkdirs()) throw new Exception("폴더를 만들지 못했어요");
                File file = new File(dir, name);
                try (FileOutputStream out = new FileOutputStream(file)) { out.write(bytes); }
                where = file.getAbsolutePath();
            }
            JSObject ret = new JSObject();
            ret.put("path", where);
            ret.put("bytes", bytes.length);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("파일을 저장하지 못했어요: " + e.getMessage());
        }
    }
}
