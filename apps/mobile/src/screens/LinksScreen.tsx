import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData, useTheme } from '../hooks/useStore';
import { Link, Theme } from '../store/atoms';

export default function LinksScreen() {
  const { links, addLink, deleteLink, loading } = useData();
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [showModal, setShowModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddLink = async () => {
    const url = urlInput.trim();
    if (!url) return;

    setSaving(true);

    try {
      let title = url;
      let favicon = '';

      try {
        const fullUrl = url.startsWith('http') ? url : `https://${url}`;
        const urlObj = new URL(fullUrl);
        favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
        title = urlObj.hostname;
      } catch {}

      addLink({ url, title, favicon });
      setUrlInput('');
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenLink = (url: string) => {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(fullUrl).catch(() => {
      Alert.alert('Error', 'Could not open link');
    });
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Link', 'Are you sure you want to delete this link?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteLink(id) },
    ]);
  };

  const renderLink = ({ item: link }: { item: Link }) => (
    <TouchableOpacity style={styles.linkItem} onPress={() => handleOpenLink(link.url)}>
      {link.favicon ? (
        <Image source={{ uri: link.favicon }} style={styles.favicon} />
      ) : (
        <View style={styles.faviconPlaceholder}>
          <Ionicons name="link" size={20} color={theme.textMuted} />
        </View>
      )}
      <View style={styles.linkInfo}>
        <Text style={styles.linkTitle} numberOfLines={1}>
          {link.title}
        </Text>
        <Text style={styles.linkUrl} numberOfLines={1}>
          {link.url}
        </Text>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(link.id)}>
        <Ionicons name="trash-outline" size={20} color={theme.danger} />
      </TouchableOpacity>
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
      {links.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No links yet. Add one to get started!</Text>
        </View>
      ) : (
        <FlatList
          data={links}
          renderItem={renderLink}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add Link</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Link</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              value={urlInput}
              onChangeText={setUrlInput}
              placeholder="Paste URL here..."
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              autoFocus
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.disabledBtn]}
                onPress={handleAddLink}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      color: theme.textSecondary,
      fontSize: 16,
    },
    list: {
      padding: 16,
    },
    linkItem: {
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
    favicon: {
      width: 32,
      height: 32,
      borderRadius: 4,
      marginRight: 12,
    },
    faviconPlaceholder: {
      width: 32,
      height: 32,
      borderRadius: 4,
      backgroundColor: theme.inputBg,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    linkInfo: {
      flex: 1,
    },
    linkTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.text,
    },
    linkUrl: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 2,
    },
    deleteBtn: {
      padding: 8,
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
      backgroundColor: theme.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 400,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      backgroundColor: theme.inputBg,
      color: theme.text,
      marginBottom: 16,
    },
    modalFooter: {
      flexDirection: 'row',
      gap: 12,
    },
    saveBtn: {
      flex: 1,
      backgroundColor: theme.primary,
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
    },
    saveBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    cancelBtn: {
      flex: 1,
      backgroundColor: theme.inputBg,
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
    },
    cancelBtnText: {
      color: theme.textSecondary,
      fontSize: 16,
      fontWeight: '600',
    },
    disabledBtn: {
      opacity: 0.5,
    },
  });
