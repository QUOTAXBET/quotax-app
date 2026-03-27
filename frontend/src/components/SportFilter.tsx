import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
            color={selected === sport.id ? '#fff' : '#9CA3AF'} 
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
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1F2937',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  buttonActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  buttonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonTextActive: {
    color: '#fff',
  },
});
