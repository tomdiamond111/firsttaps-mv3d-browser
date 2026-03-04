package com.firsttaps.firsttaps3D

import android.content.ContentResolver
import android.content.Context
import android.database.Cursor
import android.net.Uri
import android.provider.DocumentsContract
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
import androidx.exifinterface.media.ExifInterface
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.common.MethodChannel.MethodCallHandler
import io.flutter.plugin.common.MethodChannel.Result
import java.io.File
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*

/**
 * Plugin for extracting comprehensive file metadata on Android
 * 
 * Handles both content:// URIs (from file pickers) and direct file paths
 * Provides robust fallback mechanisms for different Android versions and storage types
 */
class FileMetadataPlugin : FlutterPlugin, MethodCallHandler {
    private lateinit var channel: MethodChannel
    private lateinit var context: Context
    
    companion object {
        private const val CHANNEL = "file_metadata"
        private const val VERSION = "1.0.0"
        
        // Keep the old registerWith method for backward compatibility
        fun registerWith(flutterEngine: FlutterEngine, context: Context) {
            android.util.Log.d("FileMetadataPlugin", "=== Registering FileMetadataPlugin (Legacy) ===")
            android.util.Log.d("FileMetadataPlugin", "Channel: $CHANNEL")
            android.util.Log.d("FileMetadataPlugin", "Context: ${context.javaClass.simpleName}")
            
            val channel = MethodChannel(flutterEngine.dartExecutor, CHANNEL)
            val plugin = FileMetadataPlugin()
            plugin.context = context
            channel.setMethodCallHandler(plugin)
            
            android.util.Log.d("FileMetadataPlugin", "FileMetadataPlugin registered successfully (Legacy)")
        }
    }
    
    // FlutterPlugin V2 implementation
    override fun onAttachedToEngine(flutterPluginBinding: FlutterPlugin.FlutterPluginBinding) {
        android.util.Log.d("FileMetadataPlugin", "=== FileMetadataPlugin onAttachedToEngine ===")
        channel = MethodChannel(flutterPluginBinding.binaryMessenger, CHANNEL)
        channel.setMethodCallHandler(this)
        context = flutterPluginBinding.applicationContext
        android.util.Log.d("FileMetadataPlugin", "FileMetadataPlugin attached successfully (V2)")
    }

    override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        android.util.Log.d("FileMetadataPlugin", "=== FileMetadataPlugin onDetachedFromEngine ===")
        channel.setMethodCallHandler(null)
    }
      override fun onMethodCall(call: MethodCall, result: Result) {
        android.util.Log.d("FileMetadataPlugin", "=== onMethodCall received ===")
        android.util.Log.d("FileMetadataPlugin", "Method: ${call.method}")
        android.util.Log.d("FileMetadataPlugin", "Arguments: ${call.arguments}")
        
        when (call.method) {
            "getFileMetadata" -> {
                val filePath = call.argument<String>("filePath")
                android.util.Log.d("FileMetadataPlugin", "getFileMetadata called with filePath: '$filePath'")
                if (filePath != null) {
                    handleGetFileMetadata(filePath, result)
                } else {
                    android.util.Log.e("FileMetadataPlugin", "getFileMetadata called with null filePath")
                    result.error("INVALID_ARGUMENT", "File path is required", null)
                }
            }
            "getBatchFileMetadata" -> {
                val filePaths = call.argument<List<String>>("filePaths")
                android.util.Log.d("FileMetadataPlugin", "getBatchFileMetadata called with ${filePaths?.size ?: 0} paths")
                if (filePaths != null) {
                    handleGetBatchFileMetadata(filePaths, result)
                } else {
                    android.util.Log.e("FileMetadataPlugin", "getBatchFileMetadata called with null filePaths")
                    result.error("INVALID_ARGUMENT", "File paths list is required", null)
                }
            }
            "isServiceAvailable" -> {
                android.util.Log.d("FileMetadataPlugin", "isServiceAvailable called")
                result.success(true)
            }
            "getServiceVersion" -> {
                android.util.Log.d("FileMetadataPlugin", "getServiceVersion called")
                result.success(VERSION)
            }
            else -> {
                android.util.Log.w("FileMetadataPlugin", "Unknown method called: ${call.method}")
                result.notImplemented()
            }
        }
    }
      /**
     * Extract metadata for a single file
     */    private fun handleGetFileMetadata(filePath: String, result: Result) {
        android.util.Log.d("FileMetadataPlugin", "=== handleGetFileMetadata called ===")
        android.util.Log.d("FileMetadataPlugin", "Input filePath: '$filePath'")
        android.util.Log.d("FileMetadataPlugin", "Thread: ${Thread.currentThread().name}")
        
        try {
            // Add extra safety checks
            if (filePath.isBlank()) {
                android.util.Log.e("FileMetadataPlugin", "FilePath is blank!")
                result.error("INVALID_PATH", "File path is blank", null)
                return
            }
            
            android.util.Log.d("FileMetadataPlugin", "About to call extractFileMetadata...")
            val metadata = extractFileMetadata(filePath)
            android.util.Log.d("FileMetadataPlugin", "Extracted metadata: $metadata")
            android.util.Log.d("FileMetadataPlugin", "Metadata size: ${metadata.size} entries")
            android.util.Log.d("FileMetadataPlugin", "Metadata is null: ${metadata == null}")
            android.util.Log.d("FileMetadataPlugin", "Metadata is empty: ${metadata.isEmpty()}")
            
            // Log each metadata entry
            metadata.forEach { (key, value) ->
                android.util.Log.d("FileMetadataPlugin", "  $key: $value (${value?.javaClass?.simpleName})")
            }
            
            // Always return something, even if empty
            if (metadata.isEmpty()) {
                android.util.Log.w("FileMetadataPlugin", "Metadata is empty, returning minimal data")
                val fallbackMetadata = mapOf(
                    "size" to 0L,
                    "error" to "No metadata extracted"
                )
                result.success(fallbackMetadata)
            } else {
                result.success(metadata)
            }
            android.util.Log.d("FileMetadataPlugin", "Successfully returned metadata to Flutter")
        } catch (e: Exception) {
            android.util.Log.e("FileMetadataPlugin", "Error extracting metadata for $filePath", e)
            android.util.Log.e("FileMetadataPlugin", "Exception type: ${e.javaClass.simpleName}")
            android.util.Log.e("FileMetadataPlugin", "Exception message: ${e.message}")
            android.util.Log.e("FileMetadataPlugin", "Exception stack trace: ${e.stackTraceToString()}")
            result.error("EXTRACTION_ERROR", "Failed to extract metadata: ${e.message}", null)
        }
    }
    
    /**
     * Extract metadata for multiple files
     */
    private fun handleGetBatchFileMetadata(filePaths: List<String>, result: Result) {
        try {
            val metadataList = mutableListOf<Map<String, Any?>?>()
            
            for (filePath in filePaths) {
                try {
                    val metadata = extractFileMetadata(filePath)
                    metadataList.add(metadata)
                } catch (e: Exception) {
                    android.util.Log.w("FileMetadataPlugin", "Failed to extract metadata for $filePath", e)
                    metadataList.add(null)
                }
            }
            
            result.success(metadataList)
        } catch (e: Exception) {
            android.util.Log.e("FileMetadataPlugin", "Error in batch metadata extraction", e)
            result.error("BATCH_EXTRACTION_ERROR", "Failed to extract batch metadata: ${e.message}", null)
        }
    }
      /**
     * Main metadata extraction logic
     * Handles both content:// URIs and direct file paths
     */
    private fun extractFileMetadata(filePath: String): Map<String, Any?> {
        android.util.Log.d("FileMetadataPlugin", "=== extractFileMetadata called ===")
        android.util.Log.d("FileMetadataPlugin", "Input path: '$filePath'")
        
        val result = when {
            filePath.startsWith("content://") -> {
                android.util.Log.d("FileMetadataPlugin", "Path type: content:// URI")
                extractContentUriMetadata(filePath)
            }
            filePath.startsWith("file://") -> {
                android.util.Log.d("FileMetadataPlugin", "Path type: file:// URI")
                val actualPath = filePath.substring(7)
                android.util.Log.d("FileMetadataPlugin", "Actual file path: '$actualPath'")
                extractDirectFileMetadata(actualPath)
            }
            else -> {
                android.util.Log.d("FileMetadataPlugin", "Path type: direct file path")
                extractDirectFileMetadata(filePath)
            }
        }
        
        android.util.Log.d("FileMetadataPlugin", "Final metadata result: $result")
        return result
    }
    
    /**
     * Extract metadata from content:// URI using ContentResolver
     */
    private fun extractContentUriMetadata(uriString: String): Map<String, Any?> {
        val uri = Uri.parse(uriString)
        val contentResolver = context.contentResolver
        val metadata = mutableMapOf<String, Any?>()
        
        try {
            // Query basic information using OpenableColumns
            contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    // File size
                    val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
                    if (sizeIndex != -1 && !cursor.isNull(sizeIndex)) {
                        metadata["size"] = cursor.getLong(sizeIndex)
                    }
                    
                    // Display name (for MIME type inference if needed)
                    val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (nameIndex != -1 && !cursor.isNull(nameIndex)) {
                        val displayName = cursor.getString(nameIndex)
                        metadata["displayName"] = displayName
                        
                        // Infer MIME type from extension if not available elsewhere
                        if (!metadata.containsKey("mimeType")) {
                            val extension = getFileExtension(displayName)
                            if (extension.isNotEmpty()) {
                                val mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension)
                                if (mimeType != null) {
                                    metadata["mimeType"] = mimeType
                                }
                            }
                        }
                    }
                }
            }
            
            // Get MIME type from ContentResolver
            val mimeType = contentResolver.getType(uri)
            if (mimeType != null) {
                metadata["mimeType"] = mimeType
            }
            
            // Try to get additional metadata if it's a MediaStore URI
            if (isMediaStoreUri(uri)) {
                extractMediaStoreMetadata(uri, metadata)
            }
            
            // Try to get document metadata if it's a DocumentsContract URI
            if (DocumentsContract.isDocumentUri(context, uri)) {
                extractDocumentMetadata(uri, metadata)
            }
            
        } catch (e: Exception) {
            android.util.Log.w("FileMetadataPlugin", "Error extracting content URI metadata", e)
        }
        
        return metadata
    }
      /**
     * Extract metadata from direct file path
     */
    private fun extractDirectFileMetadata(filePath: String): Map<String, Any?> {
        android.util.Log.d("FileMetadataPlugin", "=== extractDirectFileMetadata called ===")
        android.util.Log.d("FileMetadataPlugin", "File path: '$filePath'")
        
        val file = File(filePath)
        val metadata = mutableMapOf<String, Any?>()
        
        android.util.Log.d("FileMetadataPlugin", "File exists: ${file.exists()}")
        android.util.Log.d("FileMetadataPlugin", "File absolute path: '${file.absolutePath}'")
        android.util.Log.d("FileMetadataPlugin", "File canonical path: '${try { file.canonicalPath } catch (e: Exception) { "ERROR: ${e.message}" }}'")
        
        try {
            if (file.exists()) {
                // Basic file information
                val size = file.length()
                val lastModified = file.lastModified()
                val canRead = file.canRead()
                val canWrite = file.canWrite()
                val isDirectory = file.isDirectory()
                
                android.util.Log.d("FileMetadataPlugin", "File size: $size bytes")
                android.util.Log.d("FileMetadataPlugin", "Last modified: $lastModified")
                android.util.Log.d("FileMetadataPlugin", "Can read: $canRead, Can write: $canWrite, Is directory: $isDirectory")
                
                metadata["size"] = size
                metadata["lastModified"] = lastModified
                metadata["isReadable"] = canRead
                metadata["isWritable"] = canWrite
                metadata["isDirectory"] = isDirectory
                
                // Try to get file creation time (birth time) on supported systems
                // This is limited on Android, but we can try
                try {
                    val attrs = java.nio.file.Files.readAttributes(
                        java.nio.file.Paths.get(filePath), 
                        java.nio.file.attribute.BasicFileAttributes::class.java
                    )
                    val creationTime = attrs.creationTime().toMillis()
                    android.util.Log.d("FileMetadataPlugin", "File creation time: $creationTime")
                    metadata["created"] = creationTime
                } catch (e: Exception) {
                    android.util.Log.d("FileMetadataPlugin", "Could not get creation time: ${e.message}")
                    // Fallback: if we can't get creation time, don't set it
                }
                
                // File permissions (simplified)
                val permissions = StringBuilder()
                permissions.append(if (file.canRead()) "r" else "-")
                permissions.append(if (file.canWrite()) "w" else "-")
                permissions.append(if (file.canExecute()) "x" else "-")
                metadata["permissions"] = permissions.toString()
                  // MIME type from extension
                val extension = getFileExtension(file.name)
                android.util.Log.d("FileMetadataPlugin", "File extension: '$extension'")
                if (extension.isNotEmpty()) {
                    val mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension)
                    android.util.Log.d("FileMetadataPlugin", "MIME type: $mimeType")
                    if (mimeType != null) {
                        metadata["mimeType"] = mimeType
                    }
                }
                
                // Extract EXIF data for image files
                if (isImageFile(extension)) {
                    android.util.Log.d("FileMetadataPlugin", "File is an image, extracting EXIF data...")
                    val exifData = extractExifMetadata(filePath)
                    if (exifData.isNotEmpty()) {
                        metadata.putAll(exifData)
                        android.util.Log.d("FileMetadataPlugin", "Added ${exifData.size} EXIF fields to metadata")
                    } else {
                        android.util.Log.d("FileMetadataPlugin", "No EXIF data found or extraction failed")
                    }
                }
                
                android.util.Log.d("FileMetadataPlugin", "Direct file metadata complete: $metadata")
            } else {
                android.util.Log.w("FileMetadataPlugin", "File does not exist: $filePath")
                metadata["error"] = "File does not exist"
            }
        } catch (e: SecurityException) {
            android.util.Log.w("FileMetadataPlugin", "Security exception accessing file: $filePath", e)
            metadata["error"] = "Access denied"
        } catch (e: Exception) {
            android.util.Log.w("FileMetadataPlugin", "Error accessing file: $filePath", e)
            metadata["error"] = e.message
        }
        
        return metadata
    }
    
    /**
     * Extract additional metadata from MediaStore URIs
     */
    private fun extractMediaStoreMetadata(uri: Uri, metadata: MutableMap<String, Any?>) {
        val contentResolver = context.contentResolver
        
        try {
            val projection = arrayOf(
                MediaStore.Files.FileColumns.DATE_MODIFIED,
                MediaStore.Files.FileColumns.DATE_ADDED,
                MediaStore.Files.FileColumns.MIME_TYPE,
                MediaStore.Files.FileColumns.SIZE
            )
            
            contentResolver.query(uri, projection, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    // Last modified (prefer this over file system timestamp)
                    val modifiedIndex = cursor.getColumnIndex(MediaStore.Files.FileColumns.DATE_MODIFIED)
                    if (modifiedIndex != -1 && !cursor.isNull(modifiedIndex)) {
                        metadata["lastModified"] = cursor.getLong(modifiedIndex) * 1000 // Convert to milliseconds
                    }
                    
                    // Date added (creation approximation)
                    val addedIndex = cursor.getColumnIndex(MediaStore.Files.FileColumns.DATE_ADDED)
                    if (addedIndex != -1 && !cursor.isNull(addedIndex)) {
                        metadata["created"] = cursor.getLong(addedIndex) * 1000 // Convert to milliseconds
                    }
                    
                    // MIME type (prefer MediaStore over inferred)
                    val mimeIndex = cursor.getColumnIndex(MediaStore.Files.FileColumns.MIME_TYPE)
                    if (mimeIndex != -1 && !cursor.isNull(mimeIndex)) {
                        val mimeType = cursor.getString(mimeIndex)
                        if (!mimeType.isNullOrEmpty()) {
                            metadata["mimeType"] = mimeType
                        }
                    }
                    
                    // Size (prefer MediaStore if available)
                    val sizeIndex = cursor.getColumnIndex(MediaStore.Files.FileColumns.SIZE)
                    if (sizeIndex != -1 && !cursor.isNull(sizeIndex)) {
                        metadata["size"] = cursor.getLong(sizeIndex)
                    }
                }
            }
        } catch (e: Exception) {
            android.util.Log.w("FileMetadataPlugin", "Error extracting MediaStore metadata", e)
        }
    }
    
    /**
     * Extract metadata from Documents Contract URIs
     */
    private fun extractDocumentMetadata(uri: Uri, metadata: MutableMap<String, Any?>) {
        val contentResolver = context.contentResolver
        
        try {
            val projection = arrayOf(
                DocumentsContract.Document.COLUMN_SIZE,
                DocumentsContract.Document.COLUMN_LAST_MODIFIED,
                DocumentsContract.Document.COLUMN_MIME_TYPE,
                DocumentsContract.Document.COLUMN_DISPLAY_NAME
            )
            
            contentResolver.query(uri, projection, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    // Size
                    val sizeIndex = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_SIZE)
                    if (sizeIndex != -1 && !cursor.isNull(sizeIndex)) {
                        metadata["size"] = cursor.getLong(sizeIndex)
                    }
                    
                    // Last modified
                    val modifiedIndex = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_LAST_MODIFIED)
                    if (modifiedIndex != -1 && !cursor.isNull(modifiedIndex)) {
                        metadata["lastModified"] = cursor.getLong(modifiedIndex)
                    }
                    
                    // MIME type
                    val mimeIndex = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_MIME_TYPE)
                    if (mimeIndex != -1 && !cursor.isNull(mimeIndex)) {
                        val mimeType = cursor.getString(mimeIndex)
                        if (!mimeType.isNullOrEmpty()) {
                            metadata["mimeType"] = mimeType
                        }
                    }
                    
                    // Display name
                    val nameIndex = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_DISPLAY_NAME)
                    if (nameIndex != -1 && !cursor.isNull(nameIndex)) {
                        metadata["displayName"] = cursor.getString(nameIndex)
                    }
                }
            }
        } catch (e: Exception) {
            android.util.Log.w("FileMetadataPlugin", "Error extracting document metadata", e)
        }    }
    
    /**
     * Extract EXIF metadata from image files
     */
    private fun extractExifMetadata(filePath: String): Map<String, Any?> {
        val exifData = mutableMapOf<String, Any?>()
        
        try {
            android.util.Log.d("FileMetadataPlugin", "Attempting to extract EXIF data from: $filePath")
            val exif = ExifInterface(filePath)
            
            // Camera/Device Info
            exif.getAttribute(ExifInterface.TAG_MAKE)?.let { 
                exifData["cameraMake"] = it 
                android.util.Log.d("FileMetadataPlugin", "Camera Make: $it")
            }
            exif.getAttribute(ExifInterface.TAG_MODEL)?.let { 
                exifData["cameraModel"] = it 
                android.util.Log.d("FileMetadataPlugin", "Camera Model: $it")
            }
            exif.getAttribute(ExifInterface.TAG_SOFTWARE)?.let { 
                exifData["software"] = it 
            }
            
            // Date/Time - prioritize original capture time
            exif.getAttribute(ExifInterface.TAG_DATETIME_ORIGINAL)?.let { 
                exifData["dateTimeOriginal"] = it 
                android.util.Log.d("FileMetadataPlugin", "DateTime Original: $it")
            }
            exif.getAttribute(ExifInterface.TAG_DATETIME)?.let { 
                exifData["dateTime"] = it 
            }
            
            // Image Dimensions
            exif.getAttributeInt(ExifInterface.TAG_IMAGE_WIDTH, 0).let { 
                if (it > 0) {
                    exifData["imageWidth"] = it 
                    android.util.Log.d("FileMetadataPlugin", "Image Width: $it")
                }
            }
            exif.getAttributeInt(ExifInterface.TAG_IMAGE_LENGTH, 0).let { 
                if (it > 0) {
                    exifData["imageHeight"] = it 
                    android.util.Log.d("FileMetadataPlugin", "Image Height: $it")
                }
            }
            
            // Camera Settings
            exif.getAttribute(ExifInterface.TAG_F_NUMBER)?.let { 
                exifData["aperture"] = it 
                android.util.Log.d("FileMetadataPlugin", "Aperture: $it")
            }
            exif.getAttribute(ExifInterface.TAG_EXPOSURE_TIME)?.let { 
                exifData["shutterSpeed"] = it 
            }
            exif.getAttribute(ExifInterface.TAG_ISO_SPEED_RATINGS)?.let { 
                exifData["iso"] = it 
            }
            exif.getAttribute(ExifInterface.TAG_FOCAL_LENGTH)?.let { 
                exifData["focalLength"] = it 
            }
            
            // GPS Location
            val latLong = FloatArray(2)
            if (exif.getLatLong(latLong)) {
                exifData["latitude"] = latLong[0].toDouble()
                exifData["longitude"] = latLong[1].toDouble()
                android.util.Log.d("FileMetadataPlugin", "GPS: ${latLong[0]}, ${latLong[1]}")
            }
            exif.getAttribute(ExifInterface.TAG_GPS_ALTITUDE)?.let { 
                exifData["altitude"] = it 
            }
            
            // Orientation
            exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL).let {
                exifData["orientation"] = it
            }
            
            // Flash and other settings
            exif.getAttribute(ExifInterface.TAG_FLASH)?.let { exifData["flash"] = it }
            exif.getAttribute(ExifInterface.TAG_WHITE_BALANCE)?.let { exifData["whiteBalance"] = it }
            
            android.util.Log.d("FileMetadataPlugin", "EXIF extraction completed. Found ${exifData.size} EXIF fields")
            
        } catch (e: IOException) {
            android.util.Log.w("FileMetadataPlugin", "Could not read EXIF data: ${e.message}")
            exifData["exifError"] = e.message
        } catch (e: Exception) {
            android.util.Log.w("FileMetadataPlugin", "Error extracting EXIF: ${e.message}")
            exifData["exifError"] = e.message
        }
        
        return exifData
    }
    
    /**
     * Check if URI is from MediaStore
     */
    private fun isMediaStoreUri(uri: Uri): Boolean {
        return uri.authority == MediaStore.AUTHORITY
    }
      /**
     * Get file extension from filename
     */
    private fun getFileExtension(fileName: String): String {
        val lastDot = fileName.lastIndexOf('.')
        return if (lastDot > 0 && lastDot < fileName.length - 1) {
            fileName.substring(lastDot + 1).lowercase()
        } else {
            ""
        }
    }
    
    /**
     * Check if file extension indicates an image file that may contain EXIF data
     */
    private fun isImageFile(extension: String): Boolean {
        return extension.lowercase() in setOf("jpg", "jpeg", "tiff", "tif", "dng", "cr2", "nef", "arw", "orf", "rw2")
    }
}
