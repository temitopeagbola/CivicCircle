import { forwardRef, useId } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, font, radius, space } from '@/theme';

import { Text } from './Text';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  /** Shows "n / max" under the field. */
  maxLengthCounter?: number;
}

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, hint, maxLengthCounter, style, multiline, value, ...props },
  ref,
) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <View style={styles.wrap}>
      <Text variant="label" nativeID={`${id}-label`}>
        {label}
      </Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        aria-labelledby={`${id}-label`}
        aria-describedby={describedBy}
        aria-invalid={!!error}
        placeholderTextColor={colors.textSubtle}
        multiline={multiline}
        value={value}
        maxLength={maxLengthCounter}
        {...props}
        style={[styles.input, multiline && styles.multiline, !!error && styles.inputError, style]}
      />
      <View style={styles.footer}>
        {error ? (
          <Text variant="caption" nativeID={`${id}-error`} style={styles.error} role="alert">
            {error}
          </Text>
        ) : hint ? (
          <Text variant="caption" muted nativeID={`${id}-hint`}>
            {hint}
          </Text>
        ) : (
          <View />
        )}
        {maxLengthCounter ? (
          <Text variant="caption" muted>
            {value?.length ?? 0} / {maxLengthCounter}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    fontFamily: font.family,
  },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  error: { color: colors.danger, flex: 1 },
});
