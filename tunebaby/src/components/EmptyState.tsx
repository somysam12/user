import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ icon = 'musical-notes-outline', title, subtitle, action }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={56} color={Colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {action && (
        <TouchableOpacity style={styles.btn} onPress={action.onPress}>
          <Text style={styles.btnText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  title: { color: Colors.text, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  subtitle: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  btn: { marginTop: 8, backgroundColor: Colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
