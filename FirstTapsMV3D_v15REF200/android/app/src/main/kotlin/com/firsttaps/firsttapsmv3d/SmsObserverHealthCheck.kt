package com.firsttaps.firsttaps3D

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import io.flutter.plugin.common.MethodChannel
import kotlinx.coroutines.*

/**
 * Health check system for SMS ContentObserver
 * Ensures observer stays registered and responsive
 */
class SmsObserverHealthCheck(
    private val context: Context,
    private val channel: MethodChannel,
    private val observer: SmsContentObserver
) {
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private var healthCheckJob: Job? = null
    private val prefs: SharedPreferences = context.getSharedPreferences("sms_observer_prefs", Context.MODE_PRIVATE)
    
    companion object {
        private const val TAG = "SmsObserverHealthCheck"
        private const val HEALTH_CHECK_INTERVAL = 30000L // 30 seconds
        private const val PREF_LAST_SMS_ID = "last_sms_id"
        private const val PREF_OBSERVER_ACTIVE = "observer_active"
    }
    
    /**
     * Start periodic health checks
     */
    fun startHealthCheck() {
        Log.d(TAG, "🏥 Starting SMS observer health checks (every ${HEALTH_CHECK_INTERVAL}ms)")
        
        healthCheckJob?.cancel()
        healthCheckJob = scope.launch {
            while (isActive) {
                try {
                    performHealthCheck()
                } catch (e: Exception) {
                    Log.e(TAG, "❌ Health check error", e)
                }
                delay(HEALTH_CHECK_INTERVAL)
            }
        }
    }
    
    /**
     * Stop health checks
     */
    fun stopHealthCheck() {
        Log.d(TAG, "🛑 Stopping SMS observer health checks")
        healthCheckJob?.cancel()
        healthCheckJob = null
    }
    
    /**
     * Perform health check and auto-recover if needed
     * Public wrapper for external calls
     */
    fun performHealthCheckAsync() {
        scope.launch {
            performHealthCheck()
        }
    }
    
    /**
     * Perform health check and auto-recover if needed (internal)
     */
    private suspend fun performHealthCheck() {
        withContext(Dispatchers.Main) {
            try {
                val isActive = prefs.getBoolean(PREF_OBSERVER_ACTIVE, false)
                
                if (!isActive) {
                    Log.w(TAG, "⚠️ Observer marked inactive - attempting re-registration")
                    reRegisterObserver()
                } else {
                    Log.d(TAG, "✅ Observer health check passed")
                    
                    // Send heartbeat to Flutter/JavaScript
                    channel.invokeMethod("sms_observer_heartbeat", mapOf(
                        "timestamp" to System.currentTimeMillis(),
                        "active" to true
                    ))
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ Health check failed", e)
                reRegisterObserver()
            }
        }
    }
    
    /**
     * Re-register the observer after failure
     */
    private fun reRegisterObserver() {
        try {
            Log.d(TAG, "🔄 Re-registering SMS observer...")
            observer.unregister()
            observer.register()
            markObserverActive()
            Log.d(TAG, "✅ Observer re-registered successfully")
            
            // Notify Flutter/JavaScript of recovery
            channel.invokeMethod("sms_observer_recovered", mapOf(
                "timestamp" to System.currentTimeMillis()
            ))
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to re-register observer", e)
        }
    }
    
    /**
     * Mark observer as active (called after successful registration)
     */
    fun markObserverActive() {
        prefs.edit().putBoolean(PREF_OBSERVER_ACTIVE, true).apply()
        Log.d(TAG, "✅ Observer marked as active")
    }
    
    /**
     * Mark observer as inactive (called on errors)
     */
    fun markObserverInactive() {
        prefs.edit().putBoolean(PREF_OBSERVER_ACTIVE, false).apply()
        Log.w(TAG, "⚠️ Observer marked as inactive")
    }
    
    /**
     * Save last SMS ID (for persistence across app restarts)
     */
    fun saveLastSmsId(smsId: Long) {
        prefs.edit().putLong(PREF_LAST_SMS_ID, smsId).apply()
    }
    
    /**
     * Get saved last SMS ID
     */
    fun getLastSmsId(): Long {
        return prefs.getLong(PREF_LAST_SMS_ID, 0L)
    }
    
    /**
     * Cleanup resources
     */
    fun cleanup() {
        stopHealthCheck()
        scope.cancel()
    }
}
