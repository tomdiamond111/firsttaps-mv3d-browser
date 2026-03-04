package com.firsttaps.firsttapsmv3d

import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugins.GeneratedPluginRegistrant

class MainActivity : FlutterActivity() {
    // MV3D: SMS functionality disabled - no SMS observer needed
    // All SMS-related code commented out for media-focused app
    
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        
        // Register plugins using generated registrant
        GeneratedPluginRegistrant.registerWith(flutterEngine)
        
        // MV3D: FileMetadataPlugin and SmsObserverPlugin disabled
        // Uncomment below to re-enable for FirstTaps3D functionality:
        // FileMetadataPlugin.registerWith(flutterEngine, this)
        // SmsObserverPlugin.registerWith(flutterEngine, this)
    }
    
    override fun onResume() {
        super.onResume()
        // MV3D: No SMS observer to resume
    }
    
    // Ensure state is properly saved when backgrounded (e.g., when opening external links)
    // This works with AutomaticKeepAliveClientMixin to preserve WebView state
    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putBoolean("PRESERVE_WEBVIEW_STATE", true)
    }
    
    override fun onRestoreInstanceState(savedInstanceState: Bundle) {
        super.onRestoreInstanceState(savedInstanceState)
        // WebView state is automatically restored by Flutter's AutomaticKeepAliveClientMixin
    }
}
