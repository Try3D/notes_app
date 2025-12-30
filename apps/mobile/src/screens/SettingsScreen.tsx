import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useData, useTheme } from '../hooks/useStore';
import { API_URL } from '../config';
import { Theme } from '../store/atoms';

export default function SettingsScreen() {
  const { uuid, clearUUID } = useAuth();
  const { data, importData } = useData();
  const { theme, mode, toggleTheme } = useTheme();
  const styles = createStyles(theme);

  const [showUUID, setShowUUID] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleCopyUUID = async () => {
    if (uuid) {
      await Clipboard.setStringAsync(uuid);
      Alert.alert('Copied!', 'Your code has been copied to clipboard');
    }
  };

  const handleExportData = async () => {
    if (!data) return;

    try {
      const jsonData = JSON.stringify(data, null, 2);
      await Share.share({
        message: jsonData,
        title: 'Eisenhower Data Export',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const handleImportData = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const response = await fetch(file.uri);
        const text = await response.text();
        const importResult = importData(text);

        if (importResult.success) {
          setImportStatus({
            type: 'success',
            message: `Imported ${importResult.tasksImported} tasks and ${importResult.linksImported} links successfully!`,
          });
          setTimeout(() => setImportStatus(null), 3000);
        } else {
          setImportStatus({
            type: 'error',
            message: importResult.error || 'Import failed',
          });
          setTimeout(() => setImportStatus(null), 3000);
        }
      }
    } catch (error) {
      setImportStatus({
        type: 'error',
        message: 'Failed to read file',
      });
      setTimeout(() => setImportStatus(null), 3000);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This will permanently delete all your data and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (uuid) {
                await fetch(`${API_URL}/api/data`, {
                  method: 'DELETE',
                  headers: {
                    Authorization: `Bearer ${uuid}`,
                  },
                });
              }
              await clearUUID();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? Make sure you have saved your code safely!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => clearUUID(),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Theme Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons
                name={mode === 'dark' ? 'moon' : 'sunny'}
                size={24}
                color={theme.text}
              />
              <Text style={styles.rowText}>Dark Mode</Text>
            </View>
            <Switch
              value={mode === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.border, true: theme.primary }}
            />
          </View>
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="key-outline" size={24} color={theme.text} />
              <Text style={styles.rowText}>Your Secret Code</Text>
            </View>
            <TouchableOpacity onPress={() => setShowUUID(!showUUID)}>
              <Ionicons
                name={showUUID ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color={theme.primary}
              />
            </TouchableOpacity>
          </View>

          {showUUID && uuid && (
            <View style={styles.codeContainer}>
              <Text style={styles.codeText} selectable>
                {uuid}
              </Text>
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopyUUID}>
                <Ionicons name="copy-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.actionRow} onPress={handleExportData}>
            <Ionicons name="download-outline" size={24} color={theme.text} />
            <Text style={styles.rowText}>Export Data</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} onPress={handleImportData}>
            <Ionicons name="upload-outline" size={24} color={theme.text} />
            <Text style={styles.rowText}>Import Data</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          {importStatus && (
            <View
              style={[
                styles.statusMessage,
                importStatus.type === 'success'
                  ? styles.statusSuccess
                  : styles.statusError,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  importStatus.type === 'success'
                    ? styles.statusTextSuccess
                    : styles.statusTextError,
                ]}
              >
                {importStatus.message}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={theme.danger} />
            <Text style={[styles.rowText, { color: theme.danger }]}>Logout</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} onPress={handleDeleteAccount}>
            <Ionicons name="trash-outline" size={24} color={theme.danger} />
            <Text style={[styles.rowText, { color: theme.danger }]}>
              Delete Account
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <View style={styles.appInfo}>
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Made with </Text>
            <Text style={styles.heart}>❤️</Text>
            <Text style={styles.footerText}> by </Text>
            <Text style={styles.footerLink}>try3d</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    section: {
      paddingHorizontal: 16,
      marginTop: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textMuted,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    rowText: {
      fontSize: 16,
      color: theme.text,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    codeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.inputBg,
      margin: 12,
      marginTop: 0,
      padding: 12,
      borderRadius: 8,
      gap: 8,
    },
    codeText: {
      flex: 1,
      fontFamily: 'monospace',
      fontSize: 11,
      color: theme.text,
    },
    copyBtn: {
      backgroundColor: theme.primary,
      padding: 8,
      borderRadius: 6,
    },
    statusMessage: {
      margin: 12,
      marginTop: 0,
      padding: 12,
      borderRadius: 8,
    },
    statusSuccess: {
      backgroundColor: '#dcfce7',
    },
    statusError: {
      backgroundColor: '#fee2e2',
    },
    statusText: {
      fontSize: 14,
      fontWeight: '500',
    },
    statusTextSuccess: {
      color: '#166534',
    },
    statusTextError: {
      color: '#991b1b',
    },
    appInfo: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    footerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    heart: {
      fontSize: 14,
      marginHorizontal: 2,
    },
    footerLink: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: '600',
    },
  });
