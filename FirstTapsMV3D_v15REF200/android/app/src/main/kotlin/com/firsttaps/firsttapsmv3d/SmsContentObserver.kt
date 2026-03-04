package com.firsttaps.firsttaps3D

import android.content.Context
import android.database.ContentObserver
import android.database.Cursor
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.Log
import io.flutter.plugin.common.MethodChannel

class SmsContentObserver(
    private val context: Context,
    private val methodChannel: MethodChannel
) : ContentObserver(Handler(Looper.getMainLooper())) {

    private var lastSmsId: Long = -1
    private val smsUri = Uri.parse("content://sms") // Monitor ALL SMS, not just inbox
    private val inboxUri = Uri.parse("content://sms/inbox")
    private val sentUri = Uri.parse("content://sms/sent")

    companion object {
        private const val TAG = "SmsContentObserver"
    }

    init {
        // Get the current latest SMS ID to avoid processing old messages
        initializeLastSmsId()
    }

    override fun onChange(selfChange: Boolean) {
        super.onChange(selfChange)
        Log.d(TAG, "🔔🔔🔔 SMS database onChange() triggered (selfChange: $selfChange)")
        Log.d(TAG, "🔔 Current thread: ${Thread.currentThread().name}")
        Log.d(TAG, "🔔 Last SMS ID: $lastSmsId")
        fetchLatestSms()
    }

    override fun onChange(selfChange: Boolean, uri: Uri?) {
        super.onChange(selfChange, uri)
        Log.d(TAG, "🔔🔔🔔 SMS database onChange() triggered with URI: $uri (selfChange: $selfChange)")
        Log.d(TAG, "🔔 Current thread: ${Thread.currentThread().name}")
        Log.d(TAG, "🔔 Last SMS ID: $lastSmsId")
        fetchLatestSms()
    }

    private fun initializeLastSmsId() {
        try {
            // Check both inbox and sent for the highest ID
            val allSmsUri = Uri.parse("content://sms")
            val cursor = context.contentResolver.query(
                allSmsUri,
                arrayOf("_id"),
                null,
                null,
                "date DESC LIMIT 1"
            )

            cursor?.use {
                if (it.moveToFirst()) {
                    lastSmsId = it.getLong(it.getColumnIndexOrThrow("_id"))
                    Log.d(TAG, "Initialized with last SMS ID: $lastSmsId")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing last SMS ID", e)
        }
    }

    private fun fetchLatestSms() {
        try {
            Log.d(TAG, "🔍 fetchLatestSms() called - checking for messages newer than ID: $lastSmsId")
            
            // Query ALL SMS (inbox, sent, outbox, draft) for new messages
            val allSmsUri = Uri.parse("content://sms")
            val cursor = context.contentResolver.query(
                allSmsUri,
                arrayOf("_id", "address", "body", "date", "read", "type"),
                "_id > ?",
                arrayOf(lastSmsId.toString()),
                "date DESC"
            )

            val messageCount = cursor?.count ?: 0
            Log.d(TAG, "🔍 Query returned $messageCount new messages")

            cursor?.use {
                while (it.moveToNext()) {
                    val id = it.getLong(it.getColumnIndexOrThrow("_id"))
                    val address = it.getString(it.getColumnIndexOrThrow("address"))
                    val body = it.getString(it.getColumnIndexOrThrow("body"))
                    val date = it.getLong(it.getColumnIndexOrThrow("date"))
                    val read = it.getInt(it.getColumnIndexOrThrow("read"))
                    val type = it.getInt(it.getColumnIndexOrThrow("type"))

                    Log.d(TAG, "🚨🚨🚨 NEW SMS DETECTED via ContentObserver!")
                    Log.d(TAG, "📱 ID: $id")
                    Log.d(TAG, "📱 From/To: $address")
                    Log.d(TAG, "📱 Body: $body")
                    Log.d(TAG, "📱 Date: $date")
                    Log.d(TAG, "📱 Read: $read")
                    Log.d(TAG, "📱 Type: $type (1=inbox/received, 2=sent)")

                    // Send to Flutter
                    val smsData = mapOf(
                        "id" to id.toString(),
                        "address" to address,
                        "body" to body,
                        "date" to date,
                        "read" to read,
                        "type" to type,
                        "source" to "ContentObserver"
                    )

                    Handler(Looper.getMainLooper()).post {
                        Log.d(TAG, "📱 Sending message to Flutter via onNewSmsReceived...")
                        methodChannel.invokeMethod("onNewSmsReceived", smsData)
                        Log.d(TAG, "📱 ✅ Sent to Flutter successfully")
                    }

                    // Update last processed ID
                    if (id > lastSmsId) {
                        val previousId = lastSmsId
                        lastSmsId = id
                        Log.d(TAG, "📱 Updated lastSmsId from $previousId to $lastSmsId")
                    }
                }
            }
            
            if (messageCount == 0) {
                Log.d(TAG, "🔍 No new messages found (lastSmsId: $lastSmsId)")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error fetching latest SMS", e)
        }
    }

    fun register() {
        try {
            // Register for all SMS content changes
            context.contentResolver.registerContentObserver(
                smsUri,
                true,
                this
            )
            Log.d(TAG, "📱 ✅✅✅ SMS ContentObserver registered successfully!")
            Log.d(TAG, "📱 Monitoring URI: $smsUri")
            Log.d(TAG, "📱 Inbox URI: $inboxUri")
            Log.d(TAG, "📱 Sent URI: $sentUri")
            Log.d(TAG, "📱 Current last SMS ID: $lastSmsId")
            Log.d(TAG, "📱 Observer instance: ${this@SmsContentObserver}")
            Log.d(TAG, "📱 Watching for onChange() callbacks...")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error registering SMS ContentObserver", e)
        }
    }

    fun unregister() {
        try {
            context.contentResolver.unregisterContentObserver(this)
            Log.d(TAG, "SMS ContentObserver unregistered")
        } catch (e: Exception) {
            Log.e(TAG, "Error unregistering SMS ContentObserver", e)
        }
    }
}
