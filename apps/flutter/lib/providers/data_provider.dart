import 'dart:async';
import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../models/task.dart';
import '../models/link.dart';
import '../models/user_data.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';

class DataProvider extends ChangeNotifier {
  final StorageService _storage;
  String? _uuid;
  UserData? _data;
  bool _isLoading = true;
  Timer? _pollTimer;
  bool _isPollingActive = false;
  static const _pollInterval = Duration(seconds: 30); // 30 seconds

  DataProvider(this._storage);

  UserData? get data => _data;
  List<Task> get tasks => _data?.tasks ?? [];
  List<Link> get links => _data?.links ?? [];
  bool get isLoading => _isLoading;

  void setUUID(String? uuid) {
    _uuid = uuid;
    if (uuid != null) {
      _loadData();
      startPolling();
    } else {
      stopPolling();
      _data = null;
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Start polling for data updates (call when app is active/resumed)
  void startPolling() {
    if (_isPollingActive || _uuid == null) return;
    _isPollingActive = true;

    // Start periodic polling every 30 seconds
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(_pollInterval, (_) {
      _forceSyncFromServer();
    });
  }

  /// Stop polling (call when app goes to background)
  void stopPolling() {
    _isPollingActive = false;
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  /// Called when app resumes from background - fetch latest data immediately
  void onAppResumed() {
    if (_uuid == null) return;
    startPolling();
    _forceSyncFromServer();
  }

  /// Called when app goes to background
  void onAppPaused() {
    stopPolling();
  }

  /// Force sync from server - server is source of truth, always overwrites local
  Future<void> _forceSyncFromServer() async {
    if (_uuid == null) return;

    final api = ApiService(uuid: _uuid);
    final apiData = await api.fetchData();

    if (apiData != null) {
      // Server is source of truth - always overwrite local data
      _data = apiData;
      await _storage.setCachedData(apiData);
      notifyListeners();
    }
  }

  Future<void> _loadData() async {
    _isLoading = true;
    notifyListeners();

    // Server is source of truth - fetch from API first
    if (_uuid != null) {
      final api = ApiService(uuid: _uuid);
      final apiData = await api.fetchData();
      if (apiData != null) {
        _data = apiData;
        await _storage.setCachedData(apiData);
      } else {
        // Only use cache if server is unreachable
        final cached = _storage.getCachedData();
        if (cached != null) {
          _data = cached;
        } else {
          _data = UserData.empty();
        }
      }
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> refetch() async {
    await _loadData();
  }

  // Immediate sync to API - no debounce
  Future<void> _syncToAPI() async {
    if (_uuid == null || _data == null) return;

    _data!.updatedAt = DateTime.now().millisecondsSinceEpoch;
    await _storage.setCachedData(_data!);

    final api = ApiService(uuid: _uuid);
    await api.saveData(_data!);
  }

  // Task operations
  Task addTask({
    String title = '',
    String note = '',
    List<String>? tags,
    String color = '#ef4444',
    Quadrant? q,
    KanbanColumn? kanban,
    bool completed = false,
  }) {
    final now = DateTime.now().millisecondsSinceEpoch;
    final task = Task(
      id: const Uuid().v4(),
      title: title,
      note: note,
      tags: tags ?? [],
      color: color,
      q: q,
      kanban: kanban,
      completed: completed,
      createdAt: now,
      updatedAt: now,
    );

    _data ??= UserData.empty();
    _data!.tasks.add(task);
    notifyListeners();
    _syncToAPI();
    return task;
  }

  void updateTask(
    String id, {
    String? title,
    String? note,
    List<String>? tags,
    String? color,
    Quadrant? q,
    KanbanColumn? kanban,
    bool? completed,
    bool clearQuadrant = false,
    bool clearKanban = false,
  }) {
    if (_data == null) return;

    final index = _data!.tasks.indexWhere((t) => t.id == id);
    if (index == -1) return;

    final task = _data!.tasks[index];
    _data!.tasks[index] = task.copyWith(
      title: title,
      note: note,
      tags: tags,
      color: color,
      q: q,
      kanban: kanban,
      completed: completed,
      clearQuadrant: clearQuadrant,
      clearKanban: clearKanban,
      updatedAt: DateTime.now().millisecondsSinceEpoch,
    );

    notifyListeners();
    _syncToAPI();
  }

  void deleteTask(String id) {
    if (_data == null) return;
    _data!.tasks.removeWhere((t) => t.id == id);
    notifyListeners();
    _syncToAPI();
  }

  void reorderTasks(List<String> taskIds) {
    if (_data == null) return;

    final taskMap = {for (var t in _data!.tasks) t.id: t};
    final reordered = <Task>[];

    for (final id in taskIds) {
      if (taskMap.containsKey(id)) {
        reordered.add(taskMap[id]!);
        taskMap.remove(id);
      }
    }

    // Add any remaining tasks
    reordered.addAll(taskMap.values);
    _data!.tasks = reordered;

    notifyListeners();
    _syncToAPI();
  }

  // Link operations
  Link addLink({required String url, String title = '', String favicon = ''}) {
    final link = Link(
      id: const Uuid().v4(),
      url: url,
      title: title,
      favicon: favicon,
      createdAt: DateTime.now().millisecondsSinceEpoch,
    );

    _data ??= UserData.empty();
    _data!.links.add(link);
    notifyListeners();
    _syncToAPI();
    return link;
  }

  void deleteLink(String id) {
    if (_data == null) return;
    _data!.links.removeWhere((l) => l.id == id);
    notifyListeners();
    _syncToAPI();
  }

  void reorderLinks(List<String> linkIds) {
    if (_data == null) return;

    final linkMap = {for (var l in _data!.links) l.id: l};
    final reordered = <Link>[];

    for (final id in linkIds) {
      if (linkMap.containsKey(id)) {
        reordered.add(linkMap[id]!);
        linkMap.remove(id);
      }
    }

    // Add any remaining links
    reordered.addAll(linkMap.values);
    _data!.links = reordered;

    notifyListeners();
    _syncToAPI();
  }

  // Import/Export
  Map<String, dynamic>? exportData() {
    if (_data == null) return null;
    return {..._data!.toJson(), 'exportedAt': DateTime.now().toIso8601String()};
  }

  ImportResult importData(Map<String, dynamic> json) {
    try {
      final importedData = UserData.fromJson(json);

      if (importedData.tasks.isEmpty && importedData.links.isEmpty) {
        return ImportResult(
          success: false,
          error: 'No valid tasks or links found in the file',
        );
      }

      _data = importedData;
      _data!.updatedAt = DateTime.now().millisecondsSinceEpoch;
      notifyListeners();
      _syncToAPI();

      return ImportResult(
        success: true,
        tasksImported: importedData.tasks.length,
        linksImported: importedData.links.length,
      );
    } catch (e) {
      return ImportResult(
        success: false,
        error: 'Import failed: ${e.toString()}',
      );
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }
}

class ImportResult {
  final bool success;
  final String? error;
  final int tasksImported;
  final int linksImported;

  ImportResult({
    required this.success,
    this.error,
    this.tasksImported = 0,
    this.linksImported = 0,
  });
}
