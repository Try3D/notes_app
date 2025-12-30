import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData, useTheme } from '../hooks/useStore';
import { QUADRANT_LABELS } from '../config';
import { Task, Theme } from '../store/atoms';

type Quadrant = 'do' | 'decide' | 'delegate' | 'delete' | 'unassigned';

const QUADRANTS: { id: Quadrant; title: string; subtitle: string; color: string }[] = [
  { id: 'do', title: 'Important & Urgent', subtitle: 'Do First', color: '#ef4444' },
  { id: 'decide', title: 'Important & Not Urgent', subtitle: 'Schedule', color: '#22c55e' },
  { id: 'delegate', title: 'Not Important & Urgent', subtitle: 'Delegate', color: '#f97316' },
  { id: 'delete', title: 'Not Important & Not Urgent', subtitle: 'Eliminate', color: '#3b82f6' },
];

export default function MatrixScreen() {
  const { tasks, updateTask, loading } = useData();
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const getTasksByQuadrant = (q: Quadrant) => {
    if (q === 'unassigned') {
      return tasks.filter((t) => !t.q);
    }
    return tasks.filter((t) => t.q === q);
  };

  const handleToggleComplete = (task: Task) => {
    updateTask(task.id, { completed: !task.completed });
  };

  const handleMoveToQuadrant = (taskId: string, quadrant: Quadrant) => {
    const newQ = quadrant === 'unassigned' ? null : quadrant;
    updateTask(taskId, { q: newQ });
  };

  const renderTask = (task: Task, currentQuadrant: Quadrant) => (
    <View key={task.id} style={[styles.taskCard, task.completed && styles.taskCompleted]}>
      <TouchableOpacity
        style={[styles.checkbox, task.completed && styles.checkboxChecked]}
        onPress={() => handleToggleComplete(task)}
      >
        {task.completed && <Ionicons name="checkmark" size={14} color="#fff" />}
      </TouchableOpacity>
      <View style={styles.taskContent}>
        <View style={styles.taskHeader}>
          <View style={[styles.colorDot, { backgroundColor: task.color }]} />
          <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]} numberOfLines={1}>
            {task.title || 'Untitled'}
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moveButtons}>
          {currentQuadrant !== 'unassigned' && (
            <TouchableOpacity
              style={styles.moveBtn}
              onPress={() => handleMoveToQuadrant(task.id, 'unassigned')}
            >
              <Text style={styles.moveBtnText}>Unassign</Text>
            </TouchableOpacity>
          )}
          {QUADRANTS.filter((q) => q.id !== currentQuadrant).map((q) => (
            <TouchableOpacity
              key={q.id}
              style={[styles.moveBtn, { borderColor: q.color }]}
              onPress={() => handleMoveToQuadrant(task.id, q.id)}
            >
              <Text style={[styles.moveBtnText, { color: q.color }]}>{q.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Unassigned Section */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, { borderLeftColor: '#64748b' }]}>
          <Text style={styles.sectionTitle}>Unassigned</Text>
          <Text style={styles.sectionSubtitle}>Tap buttons to assign</Text>
        </View>
        <View style={styles.taskList}>
          {getTasksByQuadrant('unassigned').length === 0 ? (
            <Text style={styles.emptyText}>No unassigned tasks</Text>
          ) : (
            getTasksByQuadrant('unassigned').map((task) => renderTask(task, 'unassigned'))
          )}
        </View>
      </View>

      {/* Quadrants */}
      {QUADRANTS.map((quadrant) => (
        <View key={quadrant.id} style={styles.section}>
          <View style={[styles.sectionHeader, { borderLeftColor: quadrant.color }]}>
            <Text style={styles.sectionTitle}>{quadrant.title}</Text>
            <Text style={styles.sectionSubtitle}>{quadrant.subtitle}</Text>
          </View>
          <View style={styles.taskList}>
            {getTasksByQuadrant(quadrant.id).length === 0 ? (
              <Text style={styles.emptyText}>No tasks</Text>
            ) : (
              getTasksByQuadrant(quadrant.id).map((task) => renderTask(task, quadrant.id))
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
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
    section: {
      marginBottom: 20,
      backgroundColor: theme.card,
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    sectionHeader: {
      padding: 12,
      borderLeftWidth: 4,
      backgroundColor: theme.inputBg,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    sectionSubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    taskList: {
      padding: 12,
    },
    emptyText: {
      color: theme.textMuted,
      fontSize: 14,
      fontStyle: 'italic',
    },
    taskCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    taskCompleted: {
      opacity: 0.5,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: theme.border,
      marginRight: 10,
      marginTop: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    taskContent: {
      flex: 1,
    },
    taskHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    colorDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
    },
    taskTitle: {
      fontSize: 14,
      color: theme.text,
      flex: 1,
    },
    taskTitleCompleted: {
      textDecorationLine: 'line-through',
      color: theme.textMuted,
    },
    moveButtons: {
      flexDirection: 'row',
    },
    moveBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: theme.border,
      marginRight: 6,
    },
    moveBtnText: {
      fontSize: 11,
      color: theme.textSecondary,
    },
  });
