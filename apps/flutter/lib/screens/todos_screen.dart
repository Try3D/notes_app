import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/task.dart';
import '../providers/data_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/hand_drawn_widgets.dart';
import '../widgets/task_drawer.dart';

class TodosScreen extends StatefulWidget {
  const TodosScreen({super.key});

  @override
  State<TodosScreen> createState() => _TodosScreenState();
}

class _TodosScreenState extends State<TodosScreen> {
  String? _dragOverTaskId;
  String? _dragOverColor;

  static const _colors = [
    '#ef4444',
    '#22c55e',
    '#f97316',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#facc15',
    '#64748b',
    '#0f172a',
  ];

  static const _quadrantLabels = {
    Quadrant.doFirst: 'Do',
    Quadrant.decide: 'Schedule',
    Quadrant.delegate: 'Delegate',
    Quadrant.eliminate: 'Eliminate',
  };

  static const _quadrantColors = {
    Quadrant.doFirst: AppColors.red,
    Quadrant.decide: AppColors.green,
    Quadrant.delegate: AppColors.orange,
    Quadrant.eliminate: AppColors.blue,
  };

  Map<String, List<Task>> _groupByColor(List<Task> tasks) {
    final grouped = <String, List<Task>>{};
    for (final task in tasks) {
      grouped.putIfAbsent(task.color, () => []).add(task);
    }
    return grouped;
  }

  void _handleAddTask() {
    final data = context.read<DataProvider>();
    final newTask = data.addTask(title: '', note: '', color: _colors.first);
    _openTaskEditor(newTask);
  }

  void _handleTaskDrop(
    Task draggedTask,
    String targetColor, {
    Task? targetTask,
    bool atEnd = false,
  }) {
    if (draggedTask.color != targetColor)
      return; // Only reorder within same color

    final data = context.read<DataProvider>();
    final tasks = data.tasks;
    final grouped = _groupByColor(tasks);
    final colorTasks = grouped[targetColor] ?? [];

    if (targetTask != null && draggedTask.id != targetTask.id) {
      final filteredTasks = colorTasks
          .where((t) => t.id != draggedTask.id)
          .toList();
      final targetIndex = filteredTasks.indexWhere(
        (t) => t.id == targetTask.id,
      );

      if (targetIndex != -1) {
        filteredTasks.insert(targetIndex, draggedTask);
      }

      // Build new order preserving other colors
      final newTaskIds = <String>[];
      for (final color in _colors) {
        if (color == targetColor) {
          newTaskIds.addAll(filteredTasks.map((t) => t.id));
        } else if (grouped.containsKey(color)) {
          newTaskIds.addAll(grouped[color]!.map((t) => t.id));
        }
      }
      data.reorderTasks(newTaskIds);
    } else if (atEnd) {
      final filteredTasks = colorTasks
          .where((t) => t.id != draggedTask.id)
          .toList();
      filteredTasks.add(draggedTask);

      final newTaskIds = <String>[];
      for (final color in _colors) {
        if (color == targetColor) {
          newTaskIds.addAll(filteredTasks.map((t) => t.id));
        } else if (grouped.containsKey(color)) {
          newTaskIds.addAll(grouped[color]!.map((t) => t.id));
        }
      }
      data.reorderTasks(newTaskIds);
    }

    setState(() {
      _dragOverTaskId = null;
      _dragOverColor = null;
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
      clearQuadrant: updated.q == null,
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
    );
  }

  @override
  Widget build(BuildContext context) {
    final data = context.watch<DataProvider>();

    if (data.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    final grouped = _groupByColor(data.tasks);
    final sortedColors = _colors.where((c) => grouped.containsKey(c)).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.all(20),
          child: WavyUnderlineText(
            text: 'Todos',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
        ),
        Expanded(
          child: sortedColors.isEmpty
              ? Center(
                  child: Text(
                    'No todos yet. Add one to get started!',
                    style: Theme.of(
                      context,
                    ).textTheme.bodyMedium?.copyWith(color: context.mutedColor),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  itemCount: sortedColors.length + 1,
                  itemBuilder: (context, index) {
                    if (index == sortedColors.length) {
                      return _buildAddButton();
                    }
                    final color = sortedColors[index];
                    return _buildColorGroup(color, grouped[color]!);
                  },
                ),
        ),
        if (sortedColors.isEmpty)
          Padding(padding: const EdgeInsets.all(20), child: _buildAddButton()),
      ],
    );
  }

  Widget _buildColorGroup(String color, List<Task> tasks) {
    final isDragOver = _dragOverColor == color;

    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: DragTarget<Task>(
        onWillAcceptWithDetails: (details) {
          if (details.data.color == color) {
            setState(() => _dragOverColor = color);
          }
          return details.data.color == color;
        },
        onLeave: (_) {
          setState(() {
            if (_dragOverColor == color) _dragOverColor = null;
          });
        },
        onAcceptWithDetails: (details) {
          _handleTaskDrop(details.data, color, atEnd: true);
        },
        builder: (context, candidateData, rejectedData) {
          return HandDrawnCard(
            padding: EdgeInsets.zero,
            isDragOver: isDragOver,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    border: Border(
                      bottom: BorderSide(color: context.borderColor, width: 2),
                    ),
                  ),
                  child: Row(
                    children: [
                      ColorDot(color: AppColors.fromHex(color), size: 14),
                      const SizedBox(width: 10),
                      Text(
                        AppColors.colorNames[color] ?? 'Other',
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
                ...tasks.map((task) => _buildTaskItem(task, color)),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildTaskItem(Task task, String color) {
    final isDragOver = _dragOverTaskId == task.id;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        DropIndicator(isVisible: isDragOver),
        DragTarget<Task>(
          onWillAcceptWithDetails: (details) {
            if (details.data.id != task.id && details.data.color == color) {
              setState(() => _dragOverTaskId = task.id);
            }
            return details.data.id != task.id && details.data.color == color;
          },
          onLeave: (_) {
            setState(() {
              if (_dragOverTaskId == task.id) _dragOverTaskId = null;
            });
          },
          onAcceptWithDetails: (details) {
            _handleTaskDrop(details.data, color, targetTask: task);
          },
          builder: (context, candidateData, rejectedData) {
            return LongPressDraggable<Task>(
              data: task,
              delay: const Duration(milliseconds: 200),
              feedback: Material(
                elevation: 4,
                borderRadius: BorderRadius.circular(2),
                child: Container(
                  width: 300,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: context.cardColor,
                    borderRadius: BorderRadius.circular(2),
                    border: Border.all(color: context.borderColor, width: 2),
                  ),
                  child: Row(
                    children: [
                      HandDrawnCheckbox(value: task.completed, onChanged: null),
                      const SizedBox(width: 12),
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
      behavior: HitTestBehavior.opaque,
      onTap: () => _openTaskEditor(task),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(color: context.hoverColor, width: 1),
          ),
        ),
        child: Row(
          children: [
            const DragHandle(),
            const SizedBox(width: 12),
            HandDrawnCheckbox(
              value: task.completed,
              onChanged: (v) {
                context.read<DataProvider>().updateTask(task.id, completed: v);
              },
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                task.title.isEmpty ? 'Untitled' : task.title,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  decoration: task.completed
                      ? TextDecoration.lineThrough
                      : null,
                  color: task.completed ? context.mutedColor : null,
                ),
              ),
            ),
            if (task.q != null) ...[
              const SizedBox(width: 8),
              QuadrantBadge(
                label: _quadrantLabels[task.q]!,
                color: _quadrantColors[task.q]!,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildAddButton() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: HandDrawnButton(
        onPressed: _handleAddTask,
        isDashed: true,
        isExpanded: true,
        child: Text(
          '+ Add Todo',
          style: TextStyle(color: context.mutedColor),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}
