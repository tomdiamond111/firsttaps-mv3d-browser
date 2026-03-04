/// User preferences for content recommendations
class RecommendationPreferences {
  /// Master toggle for recommendations feature
  bool enabled;

  // Music genre preferences
  bool musicPop;
  bool musicRock;
  bool musicHipHop;
  bool musicCountry;
  bool musicClassical;
  bool musicElectronic;

  // Video category preferences
  bool videoComedy;
  bool videoSports;
  bool videoNews;
  bool videoGaming;
  bool videoEducational;

  // Content type preferences
  bool showShorts;
  bool showMusicVideos;
  bool showAudio;

  // Content filters
  bool explicitContent;

  RecommendationPreferences({
    this.enabled = true,
    this.musicPop = true,
    this.musicRock = true,
    this.musicHipHop = true,
    this.musicCountry = false,
    this.musicClassical = false,
    this.musicElectronic = true,
    this.videoComedy = true,
    this.videoSports = true,
    this.videoNews = false,
    this.videoGaming = true,
    this.videoEducational = false,
    this.showShorts = true,
    this.showMusicVideos = true,
    this.showAudio = true,
    this.explicitContent = false,
  });

  /// Create from database map
  factory RecommendationPreferences.fromMap(Map<String, dynamic> map) {
    return RecommendationPreferences(
      enabled: (map['enabled'] as int) == 1,
      musicPop: (map['music_pop'] as int) == 1,
      musicRock: (map['music_rock'] as int) == 1,
      musicHipHop: (map['music_hip_hop'] as int) == 1,
      musicCountry: (map['music_country'] as int) == 1,
      musicClassical: (map['music_classical'] as int) == 1,
      musicElectronic: (map['music_electronic'] as int) == 1,
      videoComedy: (map['video_comedy'] as int) == 1,
      videoSports: (map['video_sports'] as int) == 1,
      videoNews: (map['video_news'] as int) == 1,
      videoGaming: (map['video_gaming'] as int) == 1,
      videoEducational: (map['video_educational'] as int) == 1,
      showShorts: (map['show_shorts'] as int) == 1,
      showMusicVideos: (map['show_music_videos'] as int) == 1,
      showAudio: (map['show_audio'] as int) == 1,
      explicitContent: (map['explicit_content'] as int) == 1,
    );
  }

  /// Convert to database map
  Map<String, dynamic> toMap() {
    return {
      'enabled': enabled ? 1 : 0,
      'music_pop': musicPop ? 1 : 0,
      'music_rock': musicRock ? 1 : 0,
      'music_hip_hop': musicHipHop ? 1 : 0,
      'music_country': musicCountry ? 1 : 0,
      'music_classical': musicClassical ? 1 : 0,
      'music_electronic': musicElectronic ? 1 : 0,
      'video_comedy': videoComedy ? 1 : 0,
      'video_sports': videoSports ? 1 : 0,
      'video_news': videoNews ? 1 : 0,
      'video_gaming': videoGaming ? 1 : 0,
      'video_educational': videoEducational ? 1 : 0,
      'show_shorts': showShorts ? 1 : 0,
      'show_music_videos': showMusicVideos ? 1 : 0,
      'show_audio': showAudio ? 1 : 0,
      'explicit_content': explicitContent ? 1 : 0,
    };
  }

  /// Get list of enabled music genres
  List<String> getEnabledMusicGenres() {
    List<String> genres = [];
    if (musicPop) genres.add('pop');
    if (musicRock) genres.add('rock');
    if (musicHipHop) genres.add('hip_hop');
    if (musicCountry) genres.add('country');
    if (musicClassical) genres.add('classical');
    if (musicElectronic) genres.add('electronic');
    return genres;
  }

  /// Get list of enabled video categories
  List<String> getEnabledVideoCategories() {
    List<String> categories = [];
    if (videoComedy) categories.add('comedy');
    if (videoSports) categories.add('sports');
    if (videoNews) categories.add('news');
    if (videoGaming) categories.add('gaming');
    if (videoEducational) categories.add('educational');
    return categories;
  }

  /// Check if any music genre is enabled
  bool get hasAnyMusicEnabled =>
      musicPop ||
      musicRock ||
      musicHipHop ||
      musicCountry ||
      musicClassical ||
      musicElectronic;

  /// Check if any video category is enabled
  bool get hasAnyVideoEnabled =>
      videoComedy ||
      videoSports ||
      videoNews ||
      videoGaming ||
      videoEducational;

  /// Create a copy with updated fields
  RecommendationPreferences copyWith({
    bool? enabled,
    bool? musicPop,
    bool? musicRock,
    bool? musicHipHop,
    bool? musicCountry,
    bool? musicClassical,
    bool? musicElectronic,
    bool? videoComedy,
    bool? videoSports,
    bool? videoNews,
    bool? videoGaming,
    bool? videoEducational,
    bool? showShorts,
    bool? showMusicVideos,
    bool? showAudio,
    bool? explicitContent,
  }) {
    return RecommendationPreferences(
      enabled: enabled ?? this.enabled,
      musicPop: musicPop ?? this.musicPop,
      musicRock: musicRock ?? this.musicRock,
      musicHipHop: musicHipHop ?? this.musicHipHop,
      musicCountry: musicCountry ?? this.musicCountry,
      musicClassical: musicClassical ?? this.musicClassical,
      musicElectronic: musicElectronic ?? this.musicElectronic,
      videoComedy: videoComedy ?? this.videoComedy,
      videoSports: videoSports ?? this.videoSports,
      videoNews: videoNews ?? this.videoNews,
      videoGaming: videoGaming ?? this.videoGaming,
      videoEducational: videoEducational ?? this.videoEducational,
      showShorts: showShorts ?? this.showShorts,
      showMusicVideos: showMusicVideos ?? this.showMusicVideos,
      showAudio: showAudio ?? this.showAudio,
      explicitContent: explicitContent ?? this.explicitContent,
    );
  }

  @override
  String toString() {
    return 'RecommendationPreferences(enabled: $enabled, '
        'music: ${getEnabledMusicGenres()}, video: ${getEnabledVideoCategories()})';
  }
}
