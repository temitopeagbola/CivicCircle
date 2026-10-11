import { router, Stack } from 'expo-router';

import { EmptyState } from '@/components/ui/States';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <EmptyState
        icon="compass-outline"
        title="This page doesn’t exist"
        message="The link may be broken or the report may have been removed."
        action={{ label: 'Back to reports', onPress: () => router.replace('/') }}
      />
    </>
  );
}
