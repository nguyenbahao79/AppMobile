import { ActivityIndicator, View } from 'react-native';
import { Redirect, Href } from 'expo-router';

import { useAuth } from '@/context/AuthContext';

export default function RootIndex() {
  const { session, isRestoring } = useAuth();

  if (isRestoring) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d0e28' }}>
        <ActivityIndicator size="large" color="#d4ff00" />
      </View>
    );
  }

  if (session?.staff) {
    return <Redirect href={"/staff" as Href} />;
  }

  if (session?.user) {
    return <Redirect href={"/user/(tabs)" as Href} />;
  }

  return <Redirect href={"/(auth)/login" as Href} />;
}
