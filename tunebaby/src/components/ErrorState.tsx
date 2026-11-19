import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface Props {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.btn} onPress={onRetry}>
          <Text style={styles.btnText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  title: { color: Colors.text, fontSize: 17, fontWeight: '600' },
  message: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  btn: { marginTop: 8, borderWidth: 1, borderColor: Colors.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 24 },
  btnText: { color: Colors.accent, fontWeight: '600', fontSize: 14 },
});
