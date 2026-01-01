import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_data.dart';

class StorageService {
  static const String _uuidKey = 'eisenhower_uuid';
  static const String _dataKey = 'eisenhower_data';
  static const String _themeKey = 'eisenhower_theme';

  final SharedPreferences _prefs;

  StorageService(this._prefs);

  static Future<StorageService> init() async {
    final prefs = await SharedPreferences.getInstance();
    return StorageService(prefs);
  }

  String? getUUID() => _prefs.getString(_uuidKey);

  Future<bool> setUUID(String uuid) => _prefs.setString(_uuidKey, uuid);

  Future<bool> clearUUID() => _prefs.remove(_uuidKey);

  bool isDarkMode() => _prefs.getBool(_themeKey) ?? false;

  Future<bool> setDarkMode(bool value) => _prefs.setBool(_themeKey, value);

  UserData? getCachedData() {
    final json = _prefs.getString(_dataKey);
    if (json == null) return null;
    try {
      return UserData.fromJson(jsonDecode(json));
    } catch (e) {
      return null;
    }
  }

  Future<bool> setCachedData(UserData data) {
    return _prefs.setString(_dataKey, jsonEncode(data.toJson()));
  }

  Future<bool> clearCachedData() => _prefs.remove(_dataKey);
}
