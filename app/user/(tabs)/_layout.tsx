import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HapticTab } from '@/components/base/haptic-tab';

const NAVY   = '#0d0d2b';
const CARD   = '#14143a';
const PURPLE = '#8b00ff';
const YELLOW = '#d4ff00';
const MUTED  = 'rgba(240,240,255,0.35)';
const BORDER = 'rgba(255,255,255,0.08)';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, nameActive, color, focused }: {
  name: IoniconName;
  nameActive: IoniconName;
  color: string;
  focused: boolean;
}) {
  return <Ionicons name={focused ? nameActive : name} size={24} color={color} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: YELLOW,
        tabBarInactiveTintColor: MUTED,
        tabBarStyle: {
          backgroundColor: CARD,
          borderTopWidth: 1,
          borderTopColor: BORDER,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.3,
          marginTop: 2,
        },
        tabBarBackground: () => null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home-outline" nameActive="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'Vé của tôi',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="ticket-outline" nameActive="ticket" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person-outline" nameActive="person" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
