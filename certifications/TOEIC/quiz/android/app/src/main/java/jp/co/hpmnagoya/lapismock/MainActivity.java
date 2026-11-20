package jp.co.hpmnagoya.lapismock;

import android.os.Bundle;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Webビューの下地を紙の色に（明るい／暗いは res/values-night/paper.xml）。UX設計書 7.3「起動画面」
        bridge.getWebView().setBackgroundColor(ContextCompat.getColor(this, R.color.paper));
    }
}
