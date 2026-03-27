import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const colors = {
  background: '#0B0F14',
  card: '#1A2332',
  cardActive: '#00FF88',
  primary: '#00FF88',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  border: '#2A3847',
};

interface SportFilterProps {
  selected: string;
  onSelect: (sport: string) => void;
}

const sports = [
  { id: 'all', label: 'Tutti', icon: 'grid' },
  { id: 'soccer', label: 'Calcio', icon: 'football' },
  { id: 'nba', label: 'NBA', icon: 'basketball' },
  { id: 'ufc', label: 'UFC', icon: 'fitness' },
];

export default function SportFilter({ selected, onSelect }: SportFilterProps) {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scrollView}
    >
      {sports.map((sport) => (
        <TouchableOpacity
          key={sport.id}
          style={[
            styles.button,
            selected === sport.id && styles.buttonActive,
          ]}
          onPress={() => onSelect(sport.id)}
        >
          <Ionicons 
            name={sport.icon as any} 
            size={18} 
            color={selected === sport.id ? colors.background : colors.textSecondary} 
          />
          <Text style={[
            styles.buttonText,
            selected === sport.id && styles.buttonTextActive,
          ]}>
            {sport.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flexGrow: 0 },
  container: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  button: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  buttonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  buttonText: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  buttonTextActive: { color: colors.background, fontWeight: '700' },
});
