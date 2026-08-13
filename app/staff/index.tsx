import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect, Href } from 'expo-router';
import { staffService } from '@/services/staffService';

export default function StaffIndex() {
  const [target, setTarget] = useState<Href | null>(null);

  useEffect(() => {
    staffService
      .getActiveShift()
      .then((shift) => setTarget(shift ? '/staff/scanner' : '/staff/shifts'))
      .catch(() => setTarget('/staff/shifts'));
  }, []);

  if (!target) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d0d2b' }}>
        <ActivityIndicator size="large" color="#d4ff00" />
      </View>
    );
  }

  return <Redirect href={target} />;
}
