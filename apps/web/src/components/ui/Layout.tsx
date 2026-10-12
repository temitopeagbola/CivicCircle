import { ScrollView, StyleSheet, View, type ScrollViewProps, type ViewProps } from 'react-native';

import { colors, maxContentWidth, radius, space } from '@/theme';

/** Centres content and caps its width so the app reads well on desktop as well as phones. */
export function Container({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.container, style]} />;
}

export function ScrollScreen({ children, contentContainerStyle, ...props }: ScrollViewProps) {
  return (
    <ScrollView
      {...props}
      style={styles.screen}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
    >
      <Container style={styles.stack}>{children}</Container>
    </ScrollView>
  );
}

export function Card({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.card, style]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' },
  scrollContent: { paddingVertical: space.lg, paddingHorizontal: space.lg },
  stack: { gap: space.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
  },
});
