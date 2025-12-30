import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth, useTheme } from '../hooks/useStore';
import { API_URL } from '../config';
import { Theme } from '../store/atoms';

type ViewType = 'main' | 'generate' | 'enter';

export default function LoginScreen() {
  const [view, setView] = useState<ViewType>('main');
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const { setUUID, generateUUID, isValidUUID } = useAuth();
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const handleGenerate = () => {
    const newUUID = generateUUID();
    setGeneratedCode(newUUID);
    setSaved(false);
    setView('generate');
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(generatedCode);
    Alert.alert('Copied!', 'Code copied to clipboard');
  };

  const handleContinue = async () => {
    if (!saved) return;
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid: generatedCode }),
      });

      const result = await response.json();
      if (result.success) {
        await setUUID(generatedCode);
      } else {
        Alert.alert('Error', 'Failed to register. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Failed to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const code = codeInput.trim();

    if (!isValidUUID(code)) {
      Alert.alert('Invalid Code', 'Please check your code and try again.');
      return;
    }

    setLoading(true);

    try {
      const existsRes = await fetch(`${API_URL}/api/exists/${code}`);
      const existsData = await existsRes.json();

      if (!existsData.data?.exists) {
        await fetch(`${API_URL}/api/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uuid: code }),
        });
      }

      await setUUID(code);
    } catch {
      Alert.alert('Error', 'Failed to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>NoteGrid</Text>
        <Text style={styles.subtitle}>Your personal productivity companion</Text>

        {view === 'main' && (
          <View style={styles.viewContainer}>
            <Text style={styles.description}>
              This app uses a simple secret code instead of username/password.
              Your code is your identity - keep it safe!
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleGenerate}>
              <Text style={styles.primaryBtnText}>Generate New Code</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => {
                setView('enter');
                setCodeInput('');
              }}
            >
              <Text style={styles.secondaryBtnText}>I Have a Code</Text>
            </TouchableOpacity>
          </View>
        )}

        {view === 'generate' && (
          <View style={styles.viewContainer}>
            <Text style={styles.warning}>
              This is your secret code. Save it somewhere safe - you won't see it again!
            </Text>

            <View style={styles.codeContainer}>
              <Text style={styles.codeText} selectable>
                {generatedCode}
              </Text>
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
                <Text style={styles.copyBtnText}>Copy</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setSaved(!saved)}
            >
              <View style={[styles.checkbox, saved && styles.checkboxChecked]}>
                {saved && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>I have saved my code safely</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryBtn, (!saved || loading) && styles.disabledBtn]}
              onPress={handleContinue}
              disabled={!saved || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Continue to App</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setView('main')}>
              <Text style={styles.secondaryBtnText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {view === 'enter' && (
          <View style={styles.viewContainer}>
            <Text style={styles.description}>
              Enter your secret code to access your data.
            </Text>

            <TextInput
              style={styles.input}
              value={codeInput}
              onChangeText={setCodeInput}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.disabledBtn]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Login</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setView('main')}>
              <Text style={styles.secondaryBtnText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: theme.background,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 8,
      color: theme.text,
    },
    subtitle: {
      fontSize: 16,
      textAlign: 'center',
      color: theme.textSecondary,
      marginBottom: 24,
    },
    viewContainer: {
      gap: 16,
    },
    description: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    warning: {
      fontSize: 14,
      color: '#f97316',
      textAlign: 'center',
      lineHeight: 20,
      fontWeight: '500',
    },
    codeContainer: {
      backgroundColor: theme.inputBg,
      borderRadius: 8,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    codeText: {
      flex: 1,
      fontFamily: 'monospace',
      fontSize: 12,
      color: theme.text,
    },
    copyBtn: {
      backgroundColor: theme.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 4,
    },
    copyBtnText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: theme.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    checkmark: {
      color: '#fff',
      fontSize: 14,
      fontWeight: 'bold',
    },
    checkboxLabel: {
      fontSize: 14,
      color: theme.text,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      backgroundColor: theme.inputBg,
      color: theme.text,
    },
    primaryBtn: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
    },
    primaryBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryBtn: {
      backgroundColor: 'transparent',
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    secondaryBtnText: {
      color: theme.textSecondary,
      fontSize: 16,
      fontWeight: '600',
    },
    disabledBtn: {
      opacity: 0.5,
    },
  });
