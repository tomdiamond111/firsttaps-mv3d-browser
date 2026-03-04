package com.firsttaps.firsttaps3D

import android.content.Context
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.common.MethodChannel.MethodCallHandler
import io.flutter.plugin.common.MethodChannel.Result

class SmsObserverPlugin : MethodCallHandler {
    
    private var smsObserver: SmsContentObserver? = null
    private var healthCheck: SmsObserverHealthCheck? = null
    private var methodChannel: MethodChannel? = null
    private var context: Context? = null

    companion object {
        private const val CHANNEL = "com.firsttaps.firsttaps3D/sms_observer"
        
        fun registerWith(flutterEngine: FlutterEngine, context: Context) {
            val channel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
            val plugin = SmsObserverPlugin()
            plugin.context = context
            plugin.methodChannel = channel
            channel.setMethodCallHandler(plugin)
        }
    }

    override fun onMethodCall(call: MethodCall, result: Result) {
        when (call.method) {
            "startSmsObserver" -> {
                startSmsObserver(result)
            }
            "stopSmsObserver" -> {
                stopSmsObserver(result)
            }
            "forceReregister" -> {
                forceReregister(result)
            }
            "forceReinitialize" -> {
                forceReinitialize(result)
            }
            else -> {
                result.notImplemented()
            }
        }
    }

    private fun startSmsObserver(result: Result) {
        try {
            val ctx = context
            val channel = methodChannel
            
            if (ctx == null || channel == null) {
                result.error("CONTEXT_ERROR", "Context or channel not available", null)
                return
            }

            if (smsObserver == null) {
                smsObserver = SmsContentObserver(ctx, channel)
            }
            
            smsObserver?.register()
            
            // Start health check system
            if (healthCheck == null) {
                healthCheck = SmsObserverHealthCheck(ctx, channel, smsObserver!!)
            }
            healthCheck?.markObserverActive()
            healthCheck?.startHealthCheck()
            
            result.success(true)
        } catch (e: Exception) {
            result.error("START_ERROR", "Failed to start SMS observer: ${e.message}", null)
        }
    }

    private fun stopSmsObserver(result: Result) {
        try {
            healthCheck?.stopHealthCheck()
            healthCheck?.cleanup()
            healthCheck = null
            smsObserver?.unregister()
            smsObserver = null
            result.success(true)
        } catch (e: Exception) {
            result.error("STOP_ERROR", "Failed to stop SMS observer: ${e.message}", null)
        }
    }
    
    private fun forceReregister(result: Result) {
        try {
            smsObserver?.unregister()
            smsObserver?.register()
            healthCheck?.markObserverActive()
            result.success(true)
        } catch (e: Exception) {
            result.error("REREGISTER_ERROR", "Failed to re-register: ${e.message}", null)
        }
    }
    
    private fun forceReinitialize(result: Result) {
        try {
            val ctx = context
            val channel = methodChannel
            
            if (ctx == null || channel == null) {
                result.error("CONTEXT_ERROR", "Context or channel not available", null)
                return
            }
            
            healthCheck?.stopHealthCheck()
            smsObserver?.unregister()
            smsObserver = SmsContentObserver(ctx, channel)
            smsObserver?.register()
            healthCheck = SmsObserverHealthCheck(ctx, channel, smsObserver!!)
            healthCheck?.markObserverActive()
            healthCheck?.startHealthCheck()
            result.success(true)
        } catch (e: Exception) {
            result.error("REINIT_ERROR", "Failed to re-initialize: ${e.message}", null)
        }
    }
    
    fun onActivityResumed() {
        // Verify observer health when app resumes
        healthCheck?.performHealthCheckAsync()
    }
}
