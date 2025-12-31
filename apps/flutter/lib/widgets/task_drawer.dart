import 'package:flutter/material.dart';
import '../models/task.dart';
import '../theme/app_theme.dart';
import 'hand_drawn_widgets.dart';

/// Shows a bottom sheet for editing a task
Future<void> showTaskEditor({
  required BuildContext context,
  required Task task,
  required Function(Task) onUpdate,
  required VoidCallback onDelete,
  bool showQuadrant = true,
  bool showKanban = false,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) => TaskEditorSheet(
      task: task,
      onUpdate: onUpdate,
      onDelete: onDelete,
      showQuadrant: showQuadrant,
      showKanban: showKanban,
    ),
  );
}

class TaskEditorSheet extends StatefulWidget {
  final Task task;
  final Function(Task) onUpdate;
  final VoidCallback onDelete;
  final bool showQuadrant;
  final bool showKanban;

  const TaskEditorSheet({
    super.key,
    required this.task,
    required this.onUpdate,
    required this.onDelete,
    this.showQuadrant = true,
    this.showKanban = false,
  });

  @override
  State<TaskEditorSheet> createState() => _TaskEditorSheetState();
}

class _TaskEditorSheetState extends State<TaskEditorSheet> {
  late TextEditingController _titleController;
  late TextEditingController _noteController;
  late Task _currentTask;

  @override
  void initState() {
    super.initState();
    _currentTask = widget.task;
    _titleController = TextEditingController(text: widget.task.title);
    _noteController = TextEditingController(text: widget.task.note);
  }

  @override
  void dispose() {
    _titleController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  void _updateTask() {
    final updated = _currentTask.copyWith(
      title: _titleController.text,
      note: _noteController.text,
      updatedAt: DateTime.now().millisecondsSinceEpoch,
    );
    setState(() => _currentTask = updated);
    widget.onUpdate(updated);
  }

  void _updateColor(String color) {
    final updated = _currentTask.copyWith(
      color: color,
      updatedAt: DateTime.now().millisecondsSinceEpoch,
    );
    setState(() => _currentTask = updated);
    widget.onUpdate(updated);
  }

  void _updateQuadrant(Quadrant? q) {
    final updated = _currentTask.copyWith(
      q: q,
      clearQuadrant: q == null,
      updatedAt: DateTime.now().millisecondsSinceEpoch,
    );
    setState(() => _currentTask = updated);
    widget.onUpdate(updated);
  }

  void _updateKanban(KanbanColumn? k) {
    final updated = _currentTask.copyWith(
      kanban: k,
      clearKanban: k == null,
      updatedAt: DateTime.now().millisecondsSinceEpoch,
    );
    setState(() => _currentTask = updated);
    widget.onUpdate(updated);
  }

  void _handleDelete() {
    Navigator.of(context).pop();
    widget.onDelete();
  }

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).size.height * 0.2,
        bottom: bottomPadding,
      ),
      child: Container(
        margin: const EdgeInsets.fromLTRB(8, 0, 8, 8),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: context.borderColor, width: 3),
        ),
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildHandle(),
                const SizedBox(height: 12),
                _buildHeader(),
                const SizedBox(height: 16),
                HandDrawnTextField(
                  controller: _titleController,
                  hintText: 'Task title',
                  autofocus: _currentTask.title.isEmpty,
                  onChanged: (_) => _updateTask(),
                ),
                const SizedBox(height: 12),
                HandDrawnTextField(
                  controller: _noteController,
                  hintText: 'Add notes...',
                  maxLines: 3,
                  onChanged: (_) => _updateTask(),
                ),
                const SizedBox(height: 16),
                if (widget.showQuadrant) ...[
                  Text(
                    'Quadrant',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 8),
                  _buildQuadrantSelector(),
                  const SizedBox(height: 16),
                ],
                if (widget.showKanban) ...[
                  Text(
                    'Kanban Column',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 8),
                  _buildKanbanSelector(),
                  const SizedBox(height: 16),
                ],
                Text('Color', style: Theme.of(context).textTheme.bodySmall),
                const SizedBox(height: 8),
                _buildColorPicker(),
                const SizedBox(height: 20),
                _buildActionButtons(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHandle() {
    return Center(
      child: Container(
        width: 40,
        height: 4,
        decoration: BoxDecoration(
          color: context.mutedColor.withValues(alpha: 0.4),
          borderRadius: BorderRadius.circular(2),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text('Edit Task', style: Theme.of(context).textTheme.titleLarge),
        IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.close),
          iconSize: 24,
        ),
      ],
    );
  }

  Widget _buildQuadrantSelector() {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: context.borderColor, width: 2),
        borderRadius: BorderRadius.circular(2),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<Quadrant?>(
          value: _currentTask.q,
          isExpanded: true,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          dropdownColor: context.cardColor,
          items: [
            DropdownMenuItem(
              value: null,
              child: Text(
                'Unassigned',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
            DropdownMenuItem(
              value: Quadrant.doFirst,
              child: Text(
                'Do First',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
            DropdownMenuItem(
              value: Quadrant.decide,
              child: Text(
                'Schedule',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
            DropdownMenuItem(
              value: Quadrant.delegate,
              child: Text(
                'Delegate',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
            DropdownMenuItem(
              value: Quadrant.eliminate,
              child: Text(
                'Eliminate',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
          ],
          onChanged: _updateQuadrant,
        ),
      ),
    );
  }

  Widget _buildKanbanSelector() {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: context.borderColor, width: 2),
        borderRadius: BorderRadius.circular(2),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<KanbanColumn?>(
          value: _currentTask.kanban,
          isExpanded: true,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          dropdownColor: context.cardColor,
          items: [
            DropdownMenuItem(
              value: null,
              child: Text(
                'Unassigned',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
            DropdownMenuItem(
              value: KanbanColumn.backlog,
              child: Text(
                'Backlog',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
            DropdownMenuItem(
              value: KanbanColumn.todo,
              child: Text(
                'To Do',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
            DropdownMenuItem(
              value: KanbanColumn.inProgress,
              child: Text(
                'In Progress',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
            DropdownMenuItem(
              value: KanbanColumn.done,
              child: Text(
                'Done',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
          ],
          onChanged: _updateKanban,
        ),
      ),
    );
  }

  Widget _buildColorPicker() {
    final colors = [
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

    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: colors.map((hex) {
        final isSelected = _currentTask.color == hex;
        return GestureDetector(
          onTap: () => _updateColor(hex),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: AppColors.fromHex(hex),
              shape: BoxShape.circle,
              border: Border.all(
                color: isSelected ? context.borderColor : Colors.transparent,
                width: 3,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildActionButtons() {
    return Row(
      children: [
        Expanded(
          child: GestureDetector(
            onTap: () => Navigator.of(context).pop(),
            child: Container(
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.green,
                borderRadius: BorderRadius.circular(2),
                border: Border.all(color: Colors.black, width: 2),
              ),
              child: const Center(
                child: Text(
                  'Done',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        GestureDetector(
          onTap: _handleDelete,
          child: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.danger,
              borderRadius: BorderRadius.circular(2),
              border: Border.all(color: Colors.black, width: 2),
            ),
            child: const Icon(Icons.delete, color: Colors.white, size: 22),
          ),
        ),
      ],
    );
  }
}
