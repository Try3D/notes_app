import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData, useTheme } from '../hooks/useStore';
import { COLORS, COLOR_NAMES, QUADRANT_LABELS } from '../config';
import { Task, Theme } from '../store/atoms';

const BADGE_COLORS: Record<string, string> = {
  do: '#fee2e2',
  decide: '#dcfce7',
  delegate: '#ffedd5',
  delete: '#dbeafe',
};

export default function TodosScreen() {
  const { tasks, addTask, updateTask, deleteTask, loading } = useData();
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formNote, setFormNote] = useState('');

  useEffect(() => {
    if (activeTask) {
      setFormTitle(activeTask.title);
      setFormNote(activeTask.note);
    }
  }, [activeTask?.id]);

  const grouped = tasks.reduce((acc, task) => {
    if (!acc[task.color]) acc[task.color] = [];
    acc[task.color].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const sortedColors = COLORS.filter((c) => grouped[c]);

  const handleAddTask = () => {
    const newTask = addTask({
      title: '',
      note: '',
      tags: [],
      color: COLORS[0],
      q: null,
      completed: false,
    });
    setActiveTask(newTask);
    setShowDrawer(true);
  };

  const handleToggleComplete = (task: Task) => {
    updateTask(task.id, { completed: !task.completed });
  };

  const handleUpdate = (updates: Partial<Task>) => {
    if (activeTask) {
      updateTask(activeTask.id, updates);
      setActiveTask({ ...activeTask, ...updates });
    }
  };

  const saveTextFields = () => {
    if (activeTask) {
      if (formTitle !== activeTask.title || formNote !== activeTask.note) {
        updateTask(activeTask.id, { title: formTitle, note: formNote });
        setActiveTask({ ...activeTask, title: formTitle, note: formNote });
      }
    }
  };

  const handleCloseDrawer = () => {
    saveTextFields();
    setShowDrawer(false);
  };

  const handleDelete = () => {
    if (activeTask) {
      deleteTask(activeTask.id);
      setShowDrawer(false);
      setActiveTask(null);
    }
  };

  const renderTask = (task: Task) => (
    <TouchableOpacity
      key={task.id}
      style={[styles.taskItem, task.completed && styles.taskCompleted]}
      onPress={() => {
        setActiveTask(task);
        setShowDrawer(true);
      }}
    >
      <TouchableOpacity
        style={[styles.checkbox, task.completed && styles.checkboxChecked]}
        onPress={() => handleToggleComplete(task)}
      >
        {task.completed && <Ionicons name="checkmark" size={16} color="#fff" />}
      </TouchableOpacity>
      <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
        {task.title || 'Untitled'}
      </Text>
      {task.q && (
        <View style={[styles.quadrantBadge, { backgroundColor: BADGE_COLORS[task.q] }]}>
          <Text style={styles.badgeText}>{QUADRANT_LABELS[task.q]}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {sortedColors.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No todos yet. Add one to get started!</Text>
          </View>
        ) : (
          sortedColors.map((color) => (
            <View key={color} style={styles.group}>
              <View style={styles.groupHeader}>
                <View style={[styles.colorDot, { backgroundColor: color }]} />
                <Text style={styles.groupTitle}>{COLOR_NAMES[color] || 'Other'}</Text>
              </View>
              {grouped[color].map((task) => renderTask(task))}
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add Todo</Text>
      </TouchableOpacity>

      <Modal
        visible={showDrawer}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseDrawer}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={handleCloseDrawer}
          />
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Edit Task</Text>
              <TouchableOpacity onPress={handleCloseDrawer}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.drawerContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={formTitle}
                onChangeText={setFormTitle}
                onBlur={saveTextFields}
                placeholder="Task title"
                placeholderTextColor={theme.textMuted}
                returnKeyType="next"
              />

              <Text style={styles.label}>Note</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formNote}
                onChangeText={setFormNote}
                onBlur={saveTextFields}
                placeholder="Add notes..."
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Color</Text>
              <View style={styles.colorPicker}>
                {COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      activeTask?.color === color && styles.colorSelected,
                    ]}
                    onPress={() => handleUpdate({ color })}
                  />
                ))}
              </View>

              <Text style={styles.label}>Quadrant</Text>
              <View style={styles.quadrantPicker}>
                {(['do', 'decide', 'delegate', 'delete', null] as const).map((q) => (
                  <TouchableOpacity
                    key={q || 'none'}
                    style={[
                      styles.quadrantOption,
                      activeTask?.q === q && styles.quadrantSelected,
                    ]}
                    onPress={() => handleUpdate({ q })}
                  >
                    <Text
                      style={[
                        styles.quadrantText,
                        activeTask?.q === q && styles.quadrantTextSelected,
                      ]}
                    >
                      {q ? QUADRANT_LABELS[q] : 'None'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.completedRow}>
                <Text style={styles.label}>Completed</Text>
                <Switch
                  value={activeTask?.completed || false}
                  onValueChange={(value) => handleUpdate({ completed: value })}
                  trackColor={{ false: theme.border, true: theme.primary }}
                />
              </View>

              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={20} color={theme.danger} />
                <Text style={styles.deleteText}>Delete Task</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollView: {
      flex: 1,
      padding: 16,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.background,
    },
    loadingText: {
      color: theme.textSecondary,
    },
    emptyState: {
      padding: 32,
      alignItems: 'center',
    },
    emptyText: {
      color: theme.textSecondary,
      fontSize: 16,
    },
    group: {
      marginBottom: 24,
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    colorDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 8,
    },
    groupTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    taskItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      padding: 16,
      borderRadius: 8,
      marginBottom: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    taskCompleted: {
      opacity: 0.6,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: theme.border,
      marginRight: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    taskTitle: {
      flex: 1,
      fontSize: 16,
      color: theme.text,
    },
    taskTitleCompleted: {
      textDecorationLine: 'line-through',
      color: theme.textMuted,
    },
    quadrantBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    badge_do: {
      backgroundColor: '#fee2e2',
    },
    badge_decide: {
      backgroundColor: '#dcfce7',
    },
    badge_delegate: {
      backgroundColor: '#ffedd5',
    },
    badge_delete: {
      backgroundColor: '#dbeafe',
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '500',
      color: '#333',
    },
    addButton: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    addButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: theme.overlay,
    },
    drawer: {
      backgroundColor: theme.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '80%',
    },
    drawerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    drawerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    drawerContent: {
      padding: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
      marginTop: 16,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      backgroundColor: theme.inputBg,
      color: theme.text,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    colorPicker: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    colorOption: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    colorSelected: {
      borderWidth: 3,
      borderColor: theme.text,
    },
    quadrantPicker: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    quadrantOption: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.inputBg,
    },
    quadrantSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    quadrantText: {
      fontSize: 14,
      color: theme.text,
    },
    quadrantTextSelected: {
      color: '#fff',
    },
    completedRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 16,
    },
    deleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
      marginBottom: 32,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.danger,
    },
    deleteText: {
      color: theme.danger,
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
  });
