import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Sparkles } from 'lucide-react-native';

interface MonthlyDumpGridPromptSlideProps {
  onCreateGrid: () => void;
}

const { width } = Dimensions.get('window');

export default function MonthlyDumpGridPromptSlide({ onCreateGrid }: MonthlyDumpGridPromptSlideProps) {
  return (
    <View style={styles.gridPromptContainer}>
      <BlurView intensity={20} tint="dark" style={styles.gridPromptBlur}>
        <Sparkles size={48} color="#C084FC" style={styles.icon} />
        <Text style={styles.gridPromptTitle}>Relive your month</Text>
        <Text style={styles.gridPromptSubtitle}>Create a custom 3x2 photo grid of your favorite moments.</Text>
        <TouchableOpacity style={styles.gridButton} onPress={onCreateGrid}>
          <Text style={styles.gridButtonText}>Make your grid</Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  gridPromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  gridPromptBlur: {
    width: width * 0.85,
    padding: 40,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  icon: {
    marginBottom: 20,
  },
  gridPromptTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  gridPromptSubtitle: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  gridButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 100,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  gridButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
});
