
package com.kavi.bitcoininvestment;

import android.os.Bundle;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        /*
         * Android Back / Gesture Navigation
         *
         * If the WebView has navigation history,
         * go to the previous page.
         *
         * If there is no history, allow Android
         * to handle the back action normally.
         */
        getOnBackPressedDispatcher().addCallback(
            this,
            new OnBackPressedCallback(true) {

                @Override
                public void handleOnBackPressed() {

                    if (bridge != null &&
                        bridge.getWebView() != null &&
                        bridge.getWebView().canGoBack()) {

                        bridge.getWebView().goBack();

                    } else {

                        setEnabled(false);

                        getOnBackPressedDispatcher()
                            .onBackPressed();
                    }
                }
            }
        );
    }
}

