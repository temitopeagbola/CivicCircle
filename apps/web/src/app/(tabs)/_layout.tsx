import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';

import { LoadingState } from '@/components/ui/States';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IconName) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingState label="Signing you in…" />;
  if (status === 'signedOut') return <Redirect href="/welcome" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontWeight: '600' },
        headerTitleStyle: { fontWeight: '700', color: colors.text },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          headerTitle: 'Reports near London Bridge',
          tabBarIcon: tabIcon('list'),
        }}
      />
      <Tabs.Screen name="map" options={{ title: 'Map', tabBarIcon: tabIcon('map') }} />
      <Tabs.Screen
        name="new"
        options={{
          title: 'Report',
          headerTitle: 'Report an issue',
          tabBarIcon: tabIcon('add-circle'),
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon('person') }} />
    </Tabs>
  );
}
