import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    
    let controller: FlutterViewController = window?.rootViewController as! FlutterViewController
    let fileMetadataChannel = FlutterMethodChannel(name: "file_metadata", binaryMessenger: controller.binaryMessenger)
    
    fileMetadataChannel.setMethodCallHandler { (call: FlutterMethodCall, result: @escaping FlutterResult) -> Void in
      // iOS implementation stub - will be implemented in future phase
      switch call.method {
      case "getFileMetadata":
        // TODO: Implement iOS file metadata extraction
        result(FlutterMethodNotImplemented)
      case "getBatchFileMetadata":
        // TODO: Implement iOS batch metadata extraction
        result(FlutterMethodNotImplemented)
      case "isServiceAvailable":
        result(false) // Not implemented yet
      case "getServiceVersion":
        result("iOS-stub-1.0.0")
      default:
        result(FlutterMethodNotImplemented)
      }
    }
    
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
