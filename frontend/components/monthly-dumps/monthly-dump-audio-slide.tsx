import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';

interface MonthlyDumpAudioSlideProps {
  month: string;
}

export default function MonthlyDumpAudioSlide({ month }: MonthlyDumpAudioSlideProps) {
  return (
    <View style={styles.audioContainer}>
      <Sparkles size={80} color="rgba(255,255,255,0.2)" />
      <Text style={styles.audioText}>Sound of {month}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  audioContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1B4B',
  },
  audioText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 20,
  },
});
