# Flutter wrapper
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.**  { *; }
-keep class io.flutter.util.**  { *; }
-keep class io.flutter.view.**  { *; }
-keep class io.flutter.**  { *; }
-keep class io.flutter.plugins.**  { *; }

# RevenueCat - Prevent obfuscation of purchase-related classes
-keep class com.revenuecat.purchases.** { *; }
-keepnames class com.revenuecat.purchases.** { *; }
-keepclassmembers class com.revenuecat.purchases.** { *; }

# Device Info Plus - Keep device information classes
-keep class io.flutter.plugins.deviceinfoplus.** { *; }

# Shared Preferences - Keep preference data classes
-keep class io.flutter.plugins.sharedpreferences.** { *; }

# File Picker - Keep file selection classes
-keep class com.mr.flutter.plugin.filepicker.** { *; }

# WebView Flutter - Keep WebView bridge classes
-keep class io.flutter.plugins.webviewflutter.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Contacts - Keep contact data classes
-keep class github.alexmercerind.flutter_contacts.** { *; }

# SMS/Telephony - Keep SMS functionality
-keep class com.shounakmulay.telephony.** { *; }

# Gson (used by various plugins)
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# Keep generic signature of classes (required for some plugins)
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# Keep source file names and line numbers for better crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
