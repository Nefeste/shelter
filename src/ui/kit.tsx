// Общие элементы экранов: текст, кнопка, карточка — на токенах студии (src/ui/theme.ts).
import React from 'react';
import { Pressable, StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native';
import { C, R, S } from './theme';

export function Txt({ children, style, dim, title, testID }: { children: React.ReactNode; style?: TextStyle; dim?: boolean; title?: boolean; testID?: string }) {
  return <Text testID={testID} style={[styles.text, dim && styles.dim, title && styles.title, style]}>{children}</Text>;
}

export function Button({ label, onPress, kind = 'primary', disabled, testID }: { label: string; onPress: () => void; kind?: 'primary' | 'ghost'; disabled?: boolean; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, kind === 'ghost' && styles.ghost, disabled && styles.disabled, pressed && styles.pressed]}>
      <Text style={[styles.buttonText, kind === 'ghost' && styles.ghostText]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style, onPress, testID }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void; testID?: string }) {
  if (!onPress) return <View testID={testID} style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: { color: C.ink, fontSize: S.body, lineHeight: 24 },
  dim: { color: C.inkSoft, fontSize: S.small, lineHeight: 20 },
  title: { fontSize: S.title, lineHeight: 34, fontWeight: '700' },
  button: { backgroundColor: C.kumach, borderRadius: R.button, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center' },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.line },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
  buttonText: { color: C.kumachInk, fontSize: S.body, fontWeight: '700' },
  ghostText: { color: C.ink },
  card: { backgroundColor: C.paper, borderRadius: R.card, borderWidth: 1, borderColor: C.line, padding: 14, gap: 6 },
});
