import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/task.dart';
import '../providers/data_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/hand_drawn_widgets.dart';
import '../widgets/task_drawer.dart';

class MatrixScreen extends StatefulWidget {
  const MatrixScreen({super.key});

  @override
  State<MatrixScreen> createState() => _MatrixScreenState();
}

class _MatrixScreenState extends State<MatrixScreen> {
  String? _dragOverQuadrant;
  String? _dragOverTaskId;

  static const _quadrants = [
    ('do', 'Important & Urgent', 'Do First', AppColors.red),
    ('decide', 'Important & Not Urgent', 'Schedule', AppColors.green),
    ('delegate', 'Not Important & Urgent', 'Delegate', AppColors.orange),
    ('delete', 'Not Important & Not Urgent', 'Eliminate', AppColors.blue),
  ];

  List<Task> _getTasksByQuadrant(List<Task> tasks, String q) {
    if (q == 'unassigned') {
      return tasks.where((t) => t.q == null).toList();
    }
    final quadrant = _stringToQuadrant(q);
    return tasks.where((t) => t.q == quadrant).toList();
  }

  Quadrant? _stringToQuadrant(String q) {
    switch (q) {
      case 'do':
        return Quadrant.doFirst;
      case 'decide':
        return Quadrant.decide;
      case 'delegate':
        return Quadrant.delegate;
      case 'delete':
        return Quadrant.eliminate;
      default:
        return null;
    }
  }

  void _handleTaskDrop(
    Task draggedTask,
    String targetQuadrant, {
    Task? targetTask,
    bool atEnd = false,
  }) {
    final data = context.read<DataProvider>();
    final tasks = data.tasks;
    final newQ = _stringToQuadrant(targetQuadrant);

    if (targetTask != null && draggedTask.id != targetTask.id) {
      // Reorder within or across quadrants
      final quadrantTasks = _getTasksByQuadrant(tasks, targetQuadrant);
      final otherTasks = tasks.where((t) {
        if (targetQuadrant == 'unassigned') return t.q != null;
        return t.q != newQ;
      }).toList();

      final filteredQuadrantTasks = quadrantTasks
          .where((t) => t.id != draggedTask.id)
          .toList();
      final targetIndex = filteredQuadrantTasks.indexWhere(
        (t) => t.id == targetTask.id,
      );

      if (targetIndex != -1) {
        filteredQuadrantTasks.insert(targetIndex, draggedTask);
      } else {
        filteredQuadrantTasks.add(draggedTask);
      }

      final newOrder = [
        ...otherTasks,
        ...filteredQuadrantTasks,
      ].map((t) => t.id).toList();

      if (draggedTask.q != newQ) {
        data.updateTask(draggedTask.id, q: newQ, clearQuadrant: newQ == null);
      }
      data.reorderTasks(newOrder);
    } else if (atEnd) {
      // Drop at end of quadrant
      final quadrantTasks = _getTasksByQuadrant(tasks, targetQuadrant);
      final otherTasks = tasks.where((t) {
        if (targetQuadrant == 'unassigned') return t.q != null;
        return t.q != newQ;
      }).toList();

      final filteredQuadrantTasks = quadrantTasks
          .where((t) => t.id != draggedTask.id)
          .toList();
      filteredQuadrantTasks.add(draggedTask);

      final newOrder = [
        ...otherTasks,
        ...filteredQuadrantTasks,
      ].map((t) => t.id).toList();

      if (draggedTask.q != newQ) {
        data.updateTask(draggedTask.id, q: newQ, clearQuadrant: newQ == null);
      }
      data.reorderTasks(newOrder);
    } else {
      // Just change quadrant
      data.updateTask(draggedTask.id, q: newQ, clearQuadrant: newQ == null);
    }

    setState(() {
      _dragOverQuadrant = null;
      _dragOverTaskId = null;
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
      showQuadrant: false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final data = context.watch<DataProvider>();

    if (data.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.all(20),
          child: WavyUnderlineText(
            text: 'Eisenhower Matrix',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
        ),
        Expanded(
          child: LayoutBuilder(
            builder: (context, constraints) {
              if (constraints.maxWidth < 800) {
                return _buildMobileLayout(data.tasks);
              }
              return _buildDesktopLayout(data.tasks);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildDesktopLayout(List<Task> tasks) {
    const double gap = 20.0;

    return SingleChildScrollView(
      padding: const EdgeInsets.only(left: 20, right: 20, bottom: 20),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              width: 280,
              child: _buildQuadrantCard(
                tasks,
                'unassigned',
                'Unassigned',
                'Drag tasks here',
                AppColors.gray,
              ),
            ),
            const SizedBox(width: gap),
            Expanded(
              child: Column(
                children: [
                  IntrinsicHeight(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Expanded(
                          child: _buildQuadrantCard(
                            tasks,
                            _quadrants[0].$1,
                            _quadrants[0].$2,
                            _quadrants[0].$3,
                            _quadrants[0].$4,
                          ),
                        ),
                        const SizedBox(width: gap),
                        Expanded(
                          child: _buildQuadrantCard(
                            tasks,
                            _quadrants[1].$1,
                            _quadrants[1].$2,
                            _quadrants[1].$3,
                            _quadrants[1].$4,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: gap),
                  IntrinsicHeight(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Expanded(
                          child: _buildQuadrantCard(
                            tasks,
                            _quadrants[2].$1,
                            _quadrants[2].$2,
                            _quadrants[2].$3,
                            _quadrants[2].$4,
                          ),
                        ),
                        const SizedBox(width: gap),
                        Expanded(
                          child: _buildQuadrantCard(
                            tasks,
                            _quadrants[3].$1,
                            _quadrants[3].$2,
                            _quadrants[3].$3,
                            _quadrants[3].$4,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMobileLayout(List<Task> tasks) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      children: [
        _buildQuadrantCard(
          tasks,
          'unassigned',
          'Unassigned',
          'Drag tasks here',
          AppColors.gray,
        ),
        const SizedBox(height: 20),
        ..._quadrants.map((q) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 20),
            child: _buildQuadrantCard(tasks, q.$1, q.$2, q.$3, q.$4),
          );
        }),
      ],
    );
  }

  Widget _buildQuadrantCard(
    List<Task> allTasks,
    String quadrantId,
    String title,
    String subtitle,
    Color color,
  ) {
    final tasks = _getTasksByQuadrant(allTasks, quadrantId);
    final isDragOver = _dragOverQuadrant == quadrantId;

    return DragTarget<Task>(
      onWillAcceptWithDetails: (details) {
        setState(() => _dragOverQuadrant = quadrantId);
        return true;
      },
      onLeave: (_) {
        setState(() {
          if (_dragOverQuadrant == quadrantId) _dragOverQuadrant = null;
        });
      },
      onAcceptWithDetails: (details) {
        _handleTaskDrop(details.data, quadrantId, atEnd: true);
      },
      builder: (context, candidateData, rejectedData) {
        return HandDrawnCard(
          headerColor: color,
          headerTitle: title,
          headerSubtitle: subtitle,
          isDragOver: isDragOver,
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ...tasks.map((task) => _buildTaskItem(task, quadrantId)),
              if (tasks.isEmpty)
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Text(
                    'No tasks',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTaskItem(Task task, String quadrantId) {
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
            _handleTaskDrop(details.data, quadrantId, targetTask: task);
          },
          builder: (context, candidateData, rejectedData) {
            return LongPressDraggable<Task>(
              data: task,
              delay: const Duration(milliseconds: 200),
              feedback: Material(
                elevation: 4,
                borderRadius: BorderRadius.circular(2),
                child: Container(
                  width: 250,
                  padding: const EdgeInsets.all(10),
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
                opacity: 0.5,
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
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: context.taskBgColor,
          borderRadius: BorderRadius.circular(2),
          border: Border.all(color: context.borderColor, width: 2),
        ),
        child: Row(
          children: [
            const DragHandle(),
            const SizedBox(width: 10),
            HandDrawnCheckbox(
              value: task.completed,
              onChanged: (v) {
                context.read<DataProvider>().updateTask(task.id, completed: v);
              },
            ),
            const SizedBox(width: 10),
            ColorDot(color: AppColors.fromHex(task.color)),
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
          ],
        ),
      ),
    );
  }
}
