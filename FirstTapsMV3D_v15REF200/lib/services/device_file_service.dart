import 'dart:io';
import 'package:video_thumbnail/video_thumbnail.dart';
import 'dart:convert'; // For base64Encode

class DeviceFileService {
  Future<bool> deleteFile(String filePath) async {
    try {
      final file = File(filePath);
      if (await file.exists()) {
        await file.delete();
        print("DeviceFileService: File deleted successfully: $filePath");
        return true;
      } else {
        print("DeviceFileService: File not found for deletion: $filePath");
        return false;
      }
    } catch (e) {
      print("DeviceFileService: Error deleting file $filePath: $e");
      return false;
    }
  }

  Future<String?> getThumbnailDataUrl(String filePath, String extension) async {
    print("XYZ_THUMBNAIL_TEST: Method called for $filePath");
    print(
      "DeviceFileService: Attempting to get thumbnail for: $filePath, extension: $extension",
    );
    try {
      final lowerExt = extension.toLowerCase();
      if (lowerExt == '.jpg' ||
          lowerExt == '.jpeg' ||
          lowerExt == '.png' ||
          lowerExt == '.gif' ||
          lowerExt == '.bmp' ||
          lowerExt == '.webp') {
        print("DeviceFileService: Processing as image type: $lowerExt");
        final file = File(filePath);
        if (await file.exists()) {
          print("DeviceFileService: Image file exists: $filePath");
          final bytes = await file.readAsBytes();
          print(
            "DeviceFileService: Image file read ${bytes.lengthInBytes} bytes.",
          );
          final dataUrl =
              'data:image/${lowerExt.substring(1)};base64,${base64Encode(bytes)}';
          print(
            "DeviceFileService: Image data URL generated (first 100 chars): ${dataUrl.substring(0, dataUrl.length > 100 ? 100 : dataUrl.length)}",
          );
          return dataUrl;
        } else {
          print("DeviceFileService: Image file does not exist: $filePath");
        }
      } else if (lowerExt == '.mp4' ||
          lowerExt == '.mov' ||
          lowerExt == '.avi' ||
          lowerExt == '.mkv' ||
          lowerExt == '.webm') {
        print("DeviceFileService: Processing as video type: $lowerExt");
        print(
          "DeviceFileService: Calling VideoThumbnail.thumbnailData for: $filePath",
        );
        final thumbnailBytes = await VideoThumbnail.thumbnailData(
          video: filePath,
          imageFormat: ImageFormat.JPEG,
          maxWidth:
              128, // specify the width of the thumbnail, let the height auto-scale
          quality: 25, // quality of the thumbnail (0-100)
        );
        if (thumbnailBytes != null) {
          print(
            "DeviceFileService: Video thumbnail generated, ${thumbnailBytes.lengthInBytes} bytes.",
          );
          final dataUrl =
              'data:image/jpeg;base64,${base64Encode(thumbnailBytes)}';
          print(
            "DeviceFileService: Video thumbnail data URL generated (first 100 chars): ${dataUrl.substring(0, dataUrl.length > 100 ? 100 : dataUrl.length)}",
          );
          return dataUrl;
        } else {
          print(
            "DeviceFileService: Video thumbnail generation returned null for: $filePath",
          );
        }
      } else {
        print(
          "DeviceFileService: Unsupported extension for thumbnail: $lowerExt",
        );
      }
    } catch (e, s) {
      print("DeviceFileService: Error generating thumbnail for $filePath: $e");
      print("DeviceFileService: Stacktrace: $s");
    }
    print("DeviceFileService: Returning null for thumbnail: $filePath");
    return null;
  }
}
