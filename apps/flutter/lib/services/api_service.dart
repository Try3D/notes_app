import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config.dart';
import '../models/task.dart';
import '../models/link.dart';
import '../models/user_data.dart';

class ApiService {
  static const String baseUrl = apiBaseUrl;

  final String? uuid;

  ApiService({this.uuid});

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (uuid != null) 'Authorization': 'Bearer $uuid',
  };

  Future<bool> checkExists(String uuid) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/exists/$uuid'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['data']?['exists'] == true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<bool> register(String uuid) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'uuid': uuid}),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['success'] == true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<UserData?> fetchData() async {
    if (uuid == null) return null;
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/data'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['data'] != null) {
          return UserData.fromJson(data['data']);
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<List<Task>?> fetchTasks() async {
    if (uuid == null) return null;
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/tasks'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['data'] != null) {
          return (data['data'] as List).map((t) => Task.fromJson(t)).toList();
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<List<Link>?> fetchLinks() async {
    if (uuid == null) return null;
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/links'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['data'] != null) {
          return (data['data'] as List).map((l) => Link.fromJson(l)).toList();
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<bool> createTask(Task task) async {
    if (uuid == null) return false;
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/tasks'),
        headers: _headers,
        body: jsonEncode(task.toJson()),
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  Future<bool> updateTask(String id, Map<String, dynamic> updates) async {
    if (uuid == null) return false;
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/api/tasks/$id'),
        headers: _headers,
        body: jsonEncode(updates),
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  Future<bool> deleteTask(String id) async {
    if (uuid == null) return false;
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/api/tasks/$id'),
        headers: _headers,
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  Future<bool> reorderTasks(List<String> taskIds) async {
    if (uuid == null) return false;
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/api/tasks/reorder'),
        headers: _headers,
        body: jsonEncode({'taskIds': taskIds}),
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  Future<bool> createLink(Link link) async {
    if (uuid == null) return false;
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/links'),
        headers: _headers,
        body: jsonEncode(link.toJson()),
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  Future<bool> deleteLink(String id) async {
    if (uuid == null) return false;
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/api/links/$id'),
        headers: _headers,
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  Future<bool> reorderLinks(List<String> linkIds) async {
    if (uuid == null) return false;
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/api/links/reorder'),
        headers: _headers,
        body: jsonEncode({'linkIds': linkIds}),
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  Future<bool> deleteAccount() async {
    if (uuid == null) return false;
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/api/account'),
        headers: _headers,
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }
}
