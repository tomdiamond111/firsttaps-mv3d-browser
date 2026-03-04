void main() {
  enum FileType { pdf, word, ppt, mp3, mp4, image, video, app, other }
  
  print('Testing FileType serialization/deserialization:');
  print('');
  
  var types = [FileType.mp3, FileType.mp4, FileType.video, FileType.app];
  
  for (var t in types) {
    var str = t.toString().split('.').last;
    print('$t -> "$str"');
    
    var found = FileType.values.firstWhere(
      (e) => e.toString().split('.').last == str,
      orElse: () => FileType.other
    );
    print('  Restored: $found');
    print('  Match: ${found == t}');
    print('');
  }
  
  // Test with JSON-like map
  print('Testing with JSON map:');
  var testCases = [
    {'type': 'mp3'},
    {'type': 'mp4'},
    {'type': 'video'},
    {'type': 'app'},
    {'type': 'invalid'},
  ];
  
  for (var json in testCases) {
    var found = FileType.values.firstWhere(
      (e) => e.toString().split('.').last == json['type'],
      orElse: () => FileType.other
    );
    print('JSON type "${json['type']}" -> $found');
  }
}
