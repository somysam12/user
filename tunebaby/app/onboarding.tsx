import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  Image, ScrollView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../src/constants/colors';
import { setOnboarded, saveSelectedArtists } from '../src/services/storage';

type Category = 'bollywood' | 'hollywood';

const BOLLYWOOD_ARTISTS = [
  { id: 'arijit_singh', name: 'Arijit Singh', img: 'https://picsum.photos/seed/arijit/200/200' },
  { id: 'jubin_nautiyal', name: 'Jubin Nautiyal', img: 'https://picsum.photos/seed/jubin/200/200' },
  { id: 'atif_aslam', name: 'Atif Aslam', img: 'https://picsum.photos/seed/atif/200/200' },
  { id: 'shreya_ghoshal', name: 'Shreya Ghoshal', img: 'https://picsum.photos/seed/shreya/200/200' },
  { id: 'sonu_nigam', name: 'Sonu Nigam', img: 'https://picsum.photos/seed/sonu/200/200' },
  { id: 'neha_kakkar', name: 'Neha Kakkar', img: 'https://picsum.photos/seed/neha/200/200' },
  { id: 'kumar_sanu', name: 'Kumar Sanu', img: 'https://picsum.photos/seed/kumar/200/200' },
  { id: 'udit_narayan', name: 'Udit Narayan', img: 'https://picsum.photos/seed/udit/200/200' },
  { id: 'alka_yagnik', name: 'Alka Yagnik', img: 'https://picsum.photos/seed/alka/200/200' },
  { id: 'lata_mangeshkar', name: 'Lata Mangeshkar', img: 'https://picsum.photos/seed/lata/200/200' },
  { id: 'ar_rahman', name: 'A.R. Rahman', img: 'https://picsum.photos/seed/arrehman/200/200' },
  { id: 'badshah', name: 'Badshah', img: 'https://picsum.photos/seed/badshah/200/200' },
  { id: 'yo_yo_honey_singh', name: 'Honey Singh', img: 'https://picsum.photos/seed/honey/200/200' },
  { id: 'sunidhi_chauhan', name: 'Sunidhi Chauhan', img: 'https://picsum.photos/seed/sunidhi/200/200' },
  { id: 'kishore_kumar', name: 'Kishore Kumar', img: 'https://picsum.photos/seed/kishore/200/200' },
  { id: 'mohd_rafi', name: 'Mohammed Rafi', img: 'https://picsum.photos/seed/rafi/200/200' },
];

const HOLLYWOOD_ARTISTS = [
  { id: 'taylor_swift', name: 'Taylor Swift', img: 'https://picsum.photos/seed/taylor/200/200' },
  { id: 'ed_sheeran', name: 'Ed Sheeran', img: 'https://picsum.photos/seed/edsheeran/200/200' },
  { id: 'the_weeknd', name: 'The Weeknd', img: 'https://picsum.photos/seed/weeknd/200/200' },
  { id: 'billie_eilish', name: 'Billie Eilish', img: 'https://picsum.photos/seed/billie/200/200' },
  { id: 'ariana_grande', name: 'Ariana Grande', img: 'https://picsum.photos/seed/ariana/200/200' },
  { id: 'post_malone', name: 'Post Malone', img: 'https://picsum.photos/seed/postmalone/200/200' },
  { id: 'drake', name: 'Drake', img: 'https://picsum.photos/seed/drake/200/200' },
  { id: 'justin_bieber', name: 'Justin Bieber', img: 'https://picsum.photos/seed/bieber/200/200' },
  { id: 'coldplay', name: 'Coldplay', img: 'https://picsum.photos/seed/coldplay/200/200' },
  { id: 'dua_lipa', name: 'Dua Lipa', img: 'https://picsum.photos/seed/dualipa/200/200' },
  { id: 'harry_styles', name: 'Harry Styles', img: 'https://picsum.photos/seed/harrystyles/200/200' },
  { id: 'bruno_mars', name: 'Bruno Mars', img: 'https://picsum.photos/seed/brunomars/200/200' },
  { id: 'imagine_dragons', name: 'Imagine Dragons', img: 'https://picsum.photos/seed/imaginedragons/200/200' },
  { id: 'eminem', name: 'Eminem', img: 'https://picsum.photos/seed/eminem/200/200' },
  { id: 'rihanna', name: 'Rihanna', img: 'https://picsum.photos/seed/rihanna/200/200' },
  { id: 'michael_jackson', name: 'Michael Jackson', img: 'https://picsum.photos/seed/mj/200/200' },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [category, setCategory] = useState<Category>('bollywood');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const artists = category === 'bollywood' ? BOLLYWOOD_ARTISTS : HOLLYWOOD_ARTISTS;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const finish = async () => {
    await saveSelectedArtists([...selected]);
    await setOnboarded(true);
    router.replace('/');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={[Colors.accent, '#ff8c42']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.logoRow}
        >
          <Ionicons name="musical-notes" size={20} color="#fff" />
          <Text style={styles.logoText}>TuneBaby</Text>
        </LinearGradient>
        <Text style={styles.heading}>Pick your favorite artists</Text>
        <Text style={styles.subheading}>We'll personalize your music feed</Text>
      </View>

      {/* Category tabs */}
      <View style={styles.catRow}>
        {(['bollywood', 'hollywood'] as Category[]).map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.catBtn, category === cat && styles.catBtnActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.catText, category === cat && styles.catTextActive]}>
              {cat === 'bollywood' ? '🎬 Bollywood' : '🎸 Hollywood'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Artist grid */}
      <FlatList
        data={artists}
        keyExtractor={(i) => i.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id);
          return (
            <TouchableOpacity
              style={[styles.artistCard, isSelected && styles.artistCardSelected]}
              onPress={() => toggle(item.id)}
              activeOpacity={0.75}
            >
              <Image source={{ uri: item.img }} style={styles.artistImg} />
              {isSelected && (
                <View style={styles.checkOverlay}>
                  <Ionicons name="checkmark-circle" size={28} color={Colors.accent} />
                </View>
              )}
              <Text style={[styles.artistName, isSelected && styles.artistNameSelected]} numberOfLines={2}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={<View style={{ height: 100 }} />}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.selectedCount}>
          {selected.size > 0 ? `${selected.size} artist${selected.size > 1 ? 's' : ''} selected` : 'Select at least 1 artist'}
        </Text>
        <TouchableOpacity
          style={[styles.continueBtn, selected.size === 0 && styles.continueBtnDisabled]}
          onPress={finish}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>
            {selected.size === 0 ? 'Skip for now' : 'Continue'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  logoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    alignSelf: 'flex-start', marginBottom: 16,
  },
  logoText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  heading: { color: Colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  subheading: { color: Colors.textSecondary, fontSize: 14, marginTop: 4 },
  catRow: {
    flexDirection: 'row', paddingHorizontal: 16, gap: 10,
    marginVertical: 12,
  },
  catBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    backgroundColor: Colors.card, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  catBtnActive: { backgroundColor: Colors.accentDim, borderColor: Colors.accent },
  catText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  catTextActive: { color: Colors.accent },
  grid: { paddingHorizontal: 10, gap: 12 },
  artistCard: {
    flex: 1, margin: 4, alignItems: 'center', gap: 6,
    padding: 8, borderRadius: 12,
    backgroundColor: Colors.card, borderWidth: 2, borderColor: 'transparent',
  },
  artistCardSelected: { borderColor: Colors.accent, backgroundColor: Colors.accentDim },
  artistImg: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.cardAlt },
  checkOverlay: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: '#fff', borderRadius: 14,
  },
  artistName: {
    color: Colors.textSecondary, fontSize: 11,
    fontWeight: '500', textAlign: 'center', lineHeight: 15,
  },
  artistNameSelected: { color: Colors.accent, fontWeight: '700' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.bg, borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: 20, paddingTop: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  selectedCount: { color: Colors.textSecondary, fontSize: 13 },
  continueBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.accent, paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 24,
  },
  continueBtnDisabled: { backgroundColor: Colors.cardAlt },
  continueBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
