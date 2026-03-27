import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import { colors } from '../../src/utils/theme';
import { useAuth } from '../../src/context/AuthContext';

export default function TabLayout() {
  const { user } = useAuth();
  const isPremium = user?.subscription_tier && user.subscription_tier !== 'free';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111820',
          borderTopColor: '#1F2933',
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#00FF88',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Partite',
          tabBarIcon: ({ color, size }) => <Ionicons name="football" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedine"
        options={{
          title: 'Schedine',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: 'Live',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="pulse" size={size} color={color} />
              <View style={{ position: 'absolute', top: -2, right: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4D4D' }} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profilo',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
