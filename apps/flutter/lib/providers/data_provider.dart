import 'dart:async';
import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../models/task.dart';
import '../models/link.dart';
import '../models/user_data.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';

enum ActivePage { tasks, links, settings }

class DataProvider extends ChangeNotifier {
  final StorageService _storage;
  String? _uuid;
  List<Task> _tasks = [];
  List<Link> _links = [];
  bool _isLoading = true;
  Timer? _pollTimer;
  bool _isPollingActive = false;
  ActivePage _activePage = ActivePage.tasks;
  static const _pollInterval = Duration(seconds: 30);

  DataProvider(this._storage);

  List<Task> get tasks => _tasks;
  List<Link> get links => _links;
  bool get isLoading => _isLoading;
  ActivePage get activePage => _activePage;

  void setActivePage(ActivePage page) {
    _activePage = page;
  }

  void setUUID(String? uuid) {
    _uuid = uuid;
    if (uuid != null) {
      _loadData();
      startPolling();
    } else {
      stopPolling();
      _tasks = [];
      _links = [];
      _isLoading = false;
      notifyListeners();
    }
  }

  void startPolling() {
    if (_isPollingActive || _uuid == null) return;
    _isPollingActive = true;

    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(_pollInterval, (_) {
      _pollActivePage();
    });
  }

  void stopPolling() {
    _isPollingActive = false;
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  Future<void> _pollActivePage() async {
    if (_uuid == null) return;

    final api = ApiService(uuid: _uuid);

    if (_activePage == ActivePage.links) {
      final apiLinks = await api.fetchLinks();
      if (apiLinks != null) {
        _links = apiLinks;
        _saveCachedData();
        notifyListeners();
      }
    } else {
      final apiTasks = await api.fetchTasks();
      if (apiTasks != null) {
        _tasks = apiTasks;
        _saveCachedData();
        notifyListeners();
      }
    }
  }

  void onAppResumed() {
    if (_uuid == null) return;
    startPolling();
    _forceSyncFromServer();
  }

  void onAppPaused() {
    stopPolling();
  }

  Future<void> _forceSyncFromServer() async {
    if (_uuid == null) return;

    final api = ApiService(uuid: _uuid);
    final apiData = await api.fetchData();

    if (apiData != null) {
      _tasks = apiData.tasks;
      _links = apiData.links;
      _saveCachedData();
      notifyListeners();
    }
  }

  Future<void> _loadData() async {
    _isLoading = true;
    notifyListeners();

    if (_uuid != null) {
      final api = ApiService(uuid: _uuid);
      final apiData = await api.fetchData();
      if (apiData != null) {
        _tasks = apiData.tasks;
        _links = apiData.links;
        _saveCachedData();
      } else {
        final cached = _storage.getCachedData();
        if (cached != null) {
          _tasks = cached.tasks;
          _links = cached.links;
        }
      }
    }

    _isLoading = false;
    notifyListeners();
  }

  void _saveCachedData() {
    final now = DateTime.now().millisecondsSinceEpoch;
    final userData = UserData(
      tasks: _tasks,
      links: _links,
      createdAt: now,
      updatedAt: now,
    );
    _storage.setCachedData(userData);
  }

  Future<void> refetch() async {
    await _loadData();
  }

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

    _tasks.add(task);
    notifyListeners();
    _saveCachedData();

    final api = ApiService(uuid: _uuid);
    api.createTask(task);

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
    final index = _tasks.indexWhere((t) => t.id == id);
    if (index == -1) return;

    final task = _tasks[index];
    final updatedTask = task.copyWith(
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

    _tasks[index] = updatedTask;
    notifyListeners();
    _saveCachedData();

    final api = ApiService(uuid: _uuid);
    api.updateTask(id, updatedTask.toJson());
  }

  void deleteTask(String id) {
    _tasks.removeWhere((t) => t.id == id);
    notifyListeners();
    _saveCachedData();

    final api = ApiService(uuid: _uuid);
    api.deleteTask(id);
  }

  void reorderTasks(List<String> taskIds) {
    final taskMap = {for (var t in _tasks) t.id: t};
    final reordered = <Task>[];

    for (final id in taskIds) {
      if (taskMap.containsKey(id)) {
        reordered.add(taskMap[id]!);
        taskMap.remove(id);
      }
    }

    reordered.addAll(taskMap.values);
    _tasks = reordered;

    notifyListeners();
    _saveCachedData();

    final api = ApiService(uuid: _uuid);
    api.reorderTasks(taskIds);
  }

  Link addLink({required String url, String title = '', String favicon = ''}) {
    final link = Link(
      id: const Uuid().v4(),
      url: url,
      title: title,
      favicon: favicon,
      createdAt: DateTime.now().millisecondsSinceEpoch,
    );

    _links.add(link);
    notifyListeners();
    _saveCachedData();

    final api = ApiService(uuid: _uuid);
    api.createLink(link);

    return link;
  }

  void deleteLink(String id) {
    _links.removeWhere((l) => l.id == id);
    notifyListeners();
    _saveCachedData();

    final api = ApiService(uuid: _uuid);
    api.deleteLink(id);
  }

  void reorderLinks(List<String> linkIds) {
    final linkMap = {for (var l in _links) l.id: l};
    final reordered = <Link>[];

    for (final id in linkIds) {
      if (linkMap.containsKey(id)) {
        reordered.add(linkMap[id]!);
        linkMap.remove(id);
      }
    }

    reordered.addAll(linkMap.values);
    _links = reordered;

    notifyListeners();
    _saveCachedData();

    final api = ApiService(uuid: _uuid);
    api.reorderLinks(linkIds);
  }

  Map<String, dynamic>? exportData() {
    return {
      'tasks': _tasks.map((t) => t.toJson()).toList(),
      'links': _links.map((l) => l.toJson()).toList(),
      'exportedAt': DateTime.now().toIso8601String(),
    };
  }

  Future<ImportResult> importData(Map<String, dynamic> json) async {
    try {
      final importedData = UserData.fromJson(json);

      if (importedData.tasks.isEmpty && importedData.links.isEmpty) {
        return ImportResult(
          success: false,
          error: 'No valid tasks or links found in the file',
        );
      }

      _tasks = importedData.tasks;
      _links = importedData.links;
      notifyListeners();
      _saveCachedData();

      final api = ApiService(uuid: _uuid);
      for (final task in _tasks) {
        await api.createTask(task);
      }
      for (final link in _links) {
        await api.createLink(link);
      }

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
