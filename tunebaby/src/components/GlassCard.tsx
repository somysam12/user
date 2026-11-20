import React from 'react';
import { Pressable, PressableProps, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';

interface Props extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  intensity?: number;
}

export function GlassCard({ children, style, intensity = 42, ...props }: Props) {
  const { colors, isDark } = useTheme();
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.shell,
        { borderColor: colors.glassBorder },
        style,
        pressed && styles.pressed,
      ]}
    >
      <BlurView
        intensity={intensity}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.blur, { backgroundColor: colors.glass }]}
      >
        {children}
      </BlurView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: { overflow: 'hidden', borderWidth: 1, borderRadius: 24 },
  blur: { flex: 1 },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.88 },
});
