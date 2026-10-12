import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card, ScrollScreen } from '@/components/ui/Layout';
import { InlineError } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { errorMessage } from '@/lib/api';
import { authErrorMessage, useAuth } from '@/lib/auth';
import { colors, radius, space } from '@/theme';

const FEATURES: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }[] = [
  { icon: 'camera', text: 'Snap a photo, drop a pin, describe the problem.' },
  { icon: 'sparkles', text: 'AI files it, rates severity and writes a one-line summary.' },
  { icon: 'copy', text: 'Duplicates nearby are flagged so neighbours back one report.' },
  { icon: 'shield-checkmark', text: 'Moderators move reports from open to resolved.' },
];

export default function WelcomeScreen() {
  const { status, signInDemo, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<null | 'demo' | 'moderator' | 'email'>(null);
  const [error, setError] = useState<string | null>(null);

  if (status === 'signedIn') return <Redirect href="/" />;

  const run = async (kind: NonNullable<typeof busy>, action: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(kind === 'email' ? authErrorMessage(err) : errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const submitEmail = () =>
    run('email', () =>
      mode === 'signIn' ? signIn(email, password) : signUp(name, email, password),
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <ScrollScreen>
        <View style={styles.hero}>
          <View style={styles.logo} accessibilityElementsHidden importantForAccessibility="no">
            <Ionicons name="location" size={28} color={colors.onPrimary} />
          </View>
          <Text variant="caption" style={styles.brand}>
            CIVICCIRCLE
          </Text>
          <Text variant="display">Spot it. Snap it. Sorted.</Text>
          <Text muted style={{ fontSize: 17, lineHeight: 26 }}>
            Report potholes, broken streetlights and fly-tipping in seconds. AI triages every report
            and spots duplicates, so the issues your neighbourhood cares about rise to the top.
          </Text>
        </View>

        <Card>
          <Button
            label="Try the demo"
            icon="play"
            size="lg"
            loading={busy === 'demo'}
            disabled={busy !== null}
            onPress={() => run('demo', () => signInDemo('resident'))}
            testID="demo-login"
          />
          <Button
            label="Try as a moderator"
            icon="shield-checkmark-outline"
            variant="secondary"
            loading={busy === 'moderator'}
            disabled={busy !== null}
            onPress={() => run('moderator', () => signInDemo('moderator'))}
            testID="demo-moderator-login"
          />
          <Text variant="caption" muted style={{ textAlign: 'center' }}>
            One click, no sign-up. The demo area is around London Bridge and its data is shared with
            other visitors.
          </Text>
          {error && busy === null ? <InlineError message={error} /> : null}
        </Card>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.text} style={styles.feature}>
              <Ionicons name={f.icon} size={20} color={colors.primary} />
              <Text style={{ flex: 1 }}>{f.text}</Text>
            </View>
          ))}
        </View>

        <Card>
          <Text variant="heading">
            {mode === 'signIn' ? 'Sign in with email' : 'Create an account'}
          </Text>
          {mode === 'signUp' ? (
            <TextField
              label="Display name"
              value={name}
              onChangeText={setName}
              autoComplete="name"
              placeholder="e.g. Priya K."
            />
          ) : null}
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoComplete="email"
            keyboardType="email-address"
            autoCapitalize="none"
            inputMode="email"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            onSubmitEditing={submitEmail}
          />
          <Button
            label={mode === 'signIn' ? 'Sign in' : 'Create account'}
            variant="secondary"
            loading={busy === 'email'}
            disabled={
              busy !== null ||
              !email ||
              password.length < 6 ||
              (mode === 'signUp' && name.trim().length < 2)
            }
            onPress={submitEmail}
          />
          <Button
            label={mode === 'signIn' ? 'New here? Create an account' : 'Have an account? Sign in'}
            variant="ghost"
            onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
          />
        </Card>
      </ScrollScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.md, paddingTop: space.xl },
  logo: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { fontWeight: '800', letterSpacing: 2, color: colors.primary },
  features: { gap: space.md, paddingHorizontal: space.xs },
  feature: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
});
