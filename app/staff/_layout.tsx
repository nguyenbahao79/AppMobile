import { ComponentProps, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { Tabs, router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HapticTab } from '@/components/base/haptic-tab';
import { staffService, StaffShift } from '@/services/staffService';

const CARD   = '#14143a';
const YELLOW = '#d4ff00';
const MUTED  = 'rgba(240,240,255,0.35)';
const BORDER = 'rgba(255,255,255,0.08)';
const POLL_INTERVAL = 30_000;

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, nameActive, color, focused }: {
  name: IoniconName; nameActive: IoniconName; color: string; focused: boolean;
}) {
  return <Ionicons name={focused ? nameActive : name} size={24} color={color} />;
}

export default function StaffTabLayout() {
  // undefined = chưa check, null = không có ca, StaffShift = đang trong ca
  const [activeShift, setActiveShift] = useState<StaffShift | null | undefined>(undefined);
  const pathname = usePathname();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkShift = async () => {
    try {
      const shift = await staffService.getActiveShift();
      setActiveShift(shift ?? null);
    } catch {
      // Lỗi mạng tạm thời — giữ nguyên trạng thái hiện tại
    }
  };

  useEffect(() => {
    checkShift();
    intervalRef.current = setInterval(checkShift, POLL_INTERVAL);

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') checkShift();
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      sub.remove();
    };
  }, []);

  // Guard: nếu không trong ca và không ở trang lịch làm → redirect
  useEffect(() => {
    if (activeShift === undefined) return;
    const onShiftsPage = pathname.includes('/staff/shifts');
    if (!activeShift && !onShiftsPage) {
      router.navigate('/staff/shifts');
    }
  }, [activeShift, pathname]);

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
      <Tabs.Screen name="index" options={{ href: null }} />

      {/* Tab soát vé — chỉ hiện khi đang trong ca */}
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Soát vé',
          href: activeShift === null ? null : undefined,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="qr-code-outline" nameActive="qr-code" color={color} focused={focused} />
          ),
        }}
      />

      {/* Tab lịch làm — luôn hiện */}
      <Tabs.Screen
        name="shifts"
        options={{
          title: 'Lịch làm',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="calendar-outline" nameActive="calendar" color={color} focused={focused} />
          ),
        }}
      />

      {/* Tab cá nhân — chỉ hiện khi đang trong ca */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          href: activeShift === null ? null : undefined,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person-outline" nameActive="person" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
