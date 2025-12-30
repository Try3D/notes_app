import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { Provider, useAtom } from 'jotai';

import { useAuth, useTheme } from './src/hooks/useStore';
import { themeModeAtom } from './src/store/atoms';

import LoginScreen from './src/screens/LoginScreen';
import TodosScreen from './src/screens/TodosScreen';
import MatrixScreen from './src/screens/MatrixScreen';
import LinksScreen from './src/screens/LinksScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function MainTabs() {
  const { theme, mode } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Todos') {
            iconName = focused ? 'checkbox' : 'checkbox-outline';
          } else if (route.name === 'Matrix') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Links') {
            iconName = focused ? 'link' : 'link-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.tabBarBorder,
        },
        headerStyle: {
          backgroundColor: theme.card,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen name="Todos" component={TodosScreen} />
      <Tab.Screen name="Matrix" component={MatrixScreen} />
      <Tab.Screen name="Links" component={LinksScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { uuid, loading } = useAuth();
  const { theme, mode } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const navTheme = mode === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <NavigationContainer theme={navTheme}>
      {uuid ? <MainTabs /> : <LoginScreen />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <Provider>
      <AppContent />
      <StatusBarWrapper />
    </Provider>
  );
}

function StatusBarWrapper() {
  const [mode] = useAtom(themeModeAtom);
  return <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />;
}
