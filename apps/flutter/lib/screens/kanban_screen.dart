import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/task.dart';
import '../providers/data_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/hand_drawn_widgets.dart';
import '../widgets/task_drawer.dart';

class KanbanScreen extends StatefulWidget {
  const KanbanScreen({super.key});

  @override
  State<KanbanScreen> createState() => _KanbanScreenState();
}

class _KanbanScreenState extends State<KanbanScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String? _dragOverTaskId;
  int? _dragOverTabIndex;

  // Edge scrolling state
  bool _isDragging = false;
  Timer? _edgeScrollDelayTimer;
  Timer? _edgeScrollIntervalTimer;
  String? _edgeDirection; // 'left' or 'right'
  static const _edgeThreshold = 50.0; // pixels from edge to trigger
  static const _edgeScrollDelay = Duration(
    milliseconds: 600,
  ); // delay before first scroll
  static const _edgeScrollInterval = Duration(
    milliseconds: 400,
  ); // interval between scrolls

  static const _columns = [
    (null, 'Unassigned', AppColors.gray),
    (KanbanColumn.backlog, 'Backlog', AppColors.gray),
    (KanbanColumn.todo, 'To Do', AppColors.purple),
    (KanbanColumn.inProgress, 'In Progress', AppColors.orange),
    (KanbanColumn.done, 'Done', AppColors.green),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _columns.length, vsync: this);
  }

  @override
  void dispose() {
    _stopEdgeScroll();
    _tabController.dispose();
    super.dispose();
  }

  void _onDragStarted() {
    setState(() => _isDragging = true);
  }

  void _onDragEnded() {
    if (!_isDragging) return;
    setState(() => _isDragging = false);
    _stopEdgeScroll();
  }

  void _startEdgeScroll(String direction) {
    if (_edgeDirection == direction && _edgeScrollDelayTimer != null) {
      return; // Already scrolling in this direction
    }

    _stopEdgeScroll();
    _edgeDirection = direction;

    // Initial delay before starting to scroll
    _edgeScrollDelayTimer = Timer(_edgeScrollDelay, () {
      _performEdgeScroll();
      // Then continue scrolling at interval
      _edgeScrollIntervalTimer = Timer.periodic(_edgeScrollInterval, (_) {
        _performEdgeScroll();
      });
    });
  }

  void _stopEdgeScroll() {
    _edgeScrollDelayTimer?.cancel();
    _edgeScrollDelayTimer = null;
    _edgeScrollIntervalTimer?.cancel();
    _edgeScrollIntervalTimer = null;
    _edgeDirection = null;
  }

  void _performEdgeScroll() {
    if (!_isDragging || _edgeDirection == null) {
      _stopEdgeScroll();
      return;
    }

    final currentIndex = _tabController.index;
    int newIndex;

    if (_edgeDirection == 'left') {
      newIndex = (currentIndex - 1).clamp(0, _columns.length - 1);
    } else {
      newIndex = (currentIndex + 1).clamp(0, _columns.length - 1);
    }

    if (newIndex != currentIndex) {
      _tabController.animateTo(newIndex);
    }
  }

  List<Task> _getTasksByColumn(List<Task> tasks, KanbanColumn? column) {
    if (column == null) {
      return tasks.where((t) => t.kanban == null).toList();
    }
    return tasks.where((t) => t.kanban == column).toList();
  }

  void _handleTaskDrop(
    Task draggedTask,
    KanbanColumn? targetColumn, {
    Task? targetTask,
    bool atEnd = false,
  }) {
    final data = context.read<DataProvider>();
    final tasks = data.tasks;

    if (targetTask != null && draggedTask.id != targetTask.id) {
      // Reorder within or across columns
      final columnTasks = _getTasksByColumn(tasks, targetColumn);
      final otherTasks = tasks.where((t) {
        if (targetColumn == null) return t.kanban != null;
        return t.kanban != targetColumn;
      }).toList();

      final filteredColumnTasks = columnTasks
          .where((t) => t.id != draggedTask.id)
          .toList();
      final targetIndex = filteredColumnTasks.indexWhere(
        (t) => t.id == targetTask.id,
      );

      if (targetIndex != -1) {
        filteredColumnTasks.insert(targetIndex, draggedTask);
      } else {
        filteredColumnTasks.add(draggedTask);
      }

      final newOrder = [
        ...otherTasks,
        ...filteredColumnTasks,
      ].map((t) => t.id).toList();

      if (draggedTask.kanban != targetColumn) {
        data.updateTask(
          draggedTask.id,
          kanban: targetColumn,
          clearKanban: targetColumn == null,
        );
      }
      data.reorderTasks(newOrder);
    } else if (atEnd) {
      // Drop at end of column
      final columnTasks = _getTasksByColumn(tasks, targetColumn);
      final otherTasks = tasks.where((t) {
        if (targetColumn == null) return t.kanban != null;
        return t.kanban != targetColumn;
      }).toList();

      final filteredColumnTasks = columnTasks
          .where((t) => t.id != draggedTask.id)
          .toList();
      filteredColumnTasks.add(draggedTask);

      final newOrder = [
        ...otherTasks,
        ...filteredColumnTasks,
      ].map((t) => t.id).toList();

      if (draggedTask.kanban != targetColumn) {
        data.updateTask(
          draggedTask.id,
          kanban: targetColumn,
          clearKanban: targetColumn == null,
        );
      }
      data.reorderTasks(newOrder);
    } else {
      // Just change column
      data.updateTask(
        draggedTask.id,
        kanban: targetColumn,
        clearKanban: targetColumn == null,
      );
    }

    setState(() {
      _dragOverTaskId = null;
      _dragOverTabIndex = null;
    });
  }

  void _handleTaskUpdate(Task updated) {
    final data = context.read<DataProvider>();
    data.updateTask(
      updated.id,
      title: updated.title,
      note: updated.note,
      color: updated.color,
      q: updated.q,
      kanban: updated.kanban,
      clearQuadrant: updated.q == null,
      clearKanban: updated.kanban == null,
    );
  }

  void _handleTaskDelete(Task task) {
    context.read<DataProvider>().deleteTask(task.id);
  }

  void _openTaskEditor(Task task) {
    showTaskEditor(
      context: context,
      task: task,
      onUpdate: _handleTaskUpdate,
      onDelete: () => _handleTaskDelete(task),
      showQuadrant: true,
      showKanban: true,
    );
  }

  void _addTask(KanbanColumn? column) {
    final task = context.read<DataProvider>().addTask(
      title: '',
      kanban: column,
    );
    _openTaskEditor(task);
  }

  void _onPointerMove(PointerMoveEvent event) {
    if (!_isDragging) return;

    final screenWidth = MediaQuery.of(context).size.width;
    final dx = event.position.dx;

    if (dx < _edgeThreshold) {
      // Near left edge
      _startEdgeScroll('left');
    } else if (dx > screenWidth - _edgeThreshold) {
      // Near right edge
      _startEdgeScroll('right');
    } else {
      _stopEdgeScroll();
    }
  }

  void _onPointerUp(PointerUpEvent event) {
    if (_isDragging) {
      _onDragEnded();
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = context.watch<DataProvider>();

    if (data.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Listener(
      onPointerMove: _onPointerMove,
      onPointerUp: _onPointerUp,
      onPointerCancel: (_) => _onDragEnded(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Text(
              'Kanban Board',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
          ),
          _buildTabBar(data.tasks),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: _columns.map((col) {
                return _buildColumnContent(data.tasks, col.$1, col.$2, col.$3);
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabBar(List<Task> tasks) {
    return Container(
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: context.borderColor, width: 2),
        ),
      ),
      child: TabBar(
        controller: _tabController,
        isScrollable: true,
        tabAlignment: TabAlignment.start,
        labelColor: context.textColor,
        unselectedLabelColor: context.mutedColor,
        indicatorColor: AppColors.blue,
        indicatorWeight: 3,
        labelStyle: Theme.of(
          context,
        ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
        tabs: _columns.asMap().entries.map((entry) {
          final index = entry.key;
          final col = entry.value;
          final count = _getTasksByColumn(tasks, col.$1).length;

          return DragTarget<Task>(
            onWillAcceptWithDetails: (details) {
              setState(() => _dragOverTabIndex = index);
              return true;
            },
            onLeave: (_) {
              setState(() {
                if (_dragOverTabIndex == index) _dragOverTabIndex = null;
              });
            },
            onAcceptWithDetails: (details) {
              _handleTaskDrop(details.data, col.$1, atEnd: true);
              // Switch to the target tab
              _tabController.animateTo(index);
            },
            builder: (context, candidateData, rejectedData) {
              final isDragOver = _dragOverTabIndex == index;
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                decoration: isDragOver
                    ? BoxDecoration(
                        color: AppColors.blue.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(4),
                      )
                    : null,
                child: Tab(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        margin: const EdgeInsets.only(right: 8),
                        decoration: BoxDecoration(
                          color: col.$3,
                          shape: BoxShape.circle,
                        ),
                      ),
                      Text(col.$2),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: context.mutedColor.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '$count',
                          style: Theme.of(context).textTheme.labelSmall,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        }).toList(),
      ),
    );
  }

  Widget _buildColumnContent(
    List<Task> allTasks,
    KanbanColumn? column,
    String title,
    Color color,
  ) {
    final tasks = _getTasksByColumn(allTasks, column);

    return DragTarget<Task>(
      onWillAcceptWithDetails: (_) => true,
      onAcceptWithDetails: (details) {
        _handleTaskDrop(details.data, column, atEnd: true);
      },
      builder: (context, candidateData, rejectedData) {
        return Column(
          children: [
            Expanded(
              child: tasks.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(40),
                        child: Text(
                          'No tasks in $title',
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(color: context.mutedColor),
                        ),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: tasks.length,
                      itemBuilder: (context, index) {
                        return _buildTaskItem(tasks[index], column);
                      },
                    ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: HandDrawnButton(
                onPressed: () => _addTask(column),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.add, size: 18),
                    SizedBox(width: 8),
                    Text('Add Task'),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildTaskItem(Task task, KanbanColumn? column) {
    final isDragOver = _dragOverTaskId == task.id;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        DropIndicator(isVisible: isDragOver),
        DragTarget<Task>(
          onWillAcceptWithDetails: (details) {
            if (details.data.id != task.id) {
              setState(() => _dragOverTaskId = task.id);
            }
            return details.data.id != task.id;
          },
          onLeave: (_) {
            setState(() {
              if (_dragOverTaskId == task.id) _dragOverTaskId = null;
            });
          },
          onAcceptWithDetails: (details) {
            _handleTaskDrop(details.data, column, targetTask: task);
          },
          builder: (context, candidateData, rejectedData) {
            return LongPressDraggable<Task>(
              data: task,
              onDragStarted: _onDragStarted,
              onDragEnd: (_) => _onDragEnded(),
              feedback: Material(
                elevation: 4,
                borderRadius: BorderRadius.circular(2),
                child: Container(
                  width: 280,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: context.cardColor,
                    borderRadius: BorderRadius.circular(2),
                    border: Border.all(color: context.borderColor, width: 2),
                  ),
                  child: Row(
                    children: [
                      ColorDot(color: AppColors.fromHex(task.color)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          task.title.isEmpty ? 'Untitled' : task.title,
                          style: Theme.of(context).textTheme.bodyMedium,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              childWhenDragging: Opacity(
                opacity: 0.4,
                child: _buildTaskContent(task),
              ),
              child: _buildTaskContent(task),
            );
          },
        ),
      ],
    );
  }

  Widget _buildTaskContent(Task task) {
    return GestureDetector(
      onTap: () => _openTaskEditor(task),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(3),
          border: Border.all(color: context.borderColor, width: 2),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                ColorDot(color: AppColors.fromHex(task.color)),
                const SizedBox(width: 10),
                HandDrawnCheckbox(
                  value: task.completed,
                  onChanged: (v) {
                    context.read<DataProvider>().updateTask(
                      task.id,
                      completed: v,
                    );
                  },
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    task.title.isEmpty ? 'Untitled' : task.title,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      decoration: task.completed
                          ? TextDecoration.lineThrough
                          : null,
                      color: task.completed ? context.mutedColor : null,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (task.q != null) ...[
                  const SizedBox(width: 8),
                  _buildQuadrantBadge(task.q!),
                ],
              ],
            ),
            if (task.note.isNotEmpty) ...[
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.only(left: 44),
                child: Text(
                  task.note.length > 80
                      ? '${task.note.substring(0, 80)}...'
                      : task.note,
                  style: Theme.of(
                    context,
                  ).textTheme.bodySmall?.copyWith(color: context.mutedColor),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildQuadrantBadge(Quadrant q) {
    final (label, color) = switch (q) {
      Quadrant.doFirst => ('Do', AppColors.red),
      Quadrant.decide => ('Schedule', AppColors.green),
      Quadrant.delegate => ('Delegate', AppColors.orange),
      Quadrant.eliminate => ('Eliminate', AppColors.blue),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(2),
      ),
      child: Text(
        label,
        style: Theme.of(
          context,
        ).textTheme.labelSmall?.copyWith(color: Colors.white, fontSize: 10),
      ),
    );
  }
}
