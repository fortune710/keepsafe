import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { scale, verticalScale } from 'react-native-size-matters';

type BackButtonPlacement = 'left' | 'right';

interface PageHeaderProps {
  title: string;
  backButtonPlacement?: BackButtonPlacement;
}

export default function PageHeader({
  title,
  backButtonPlacement = 'right',
}: PageHeaderProps) {
  const isLeftPlacement = backButtonPlacement === 'left';

  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <TouchableOpacity
        style={[
          styles.backButton,
          isLeftPlacement ? styles.leftPlacement : styles.rightPlacement,
        ]}
        onPress={() => router.back()}
      >
        {isLeftPlacement ? (
          <ChevronLeft color="#64748B" size={24} />
        ) : (
          <ChevronRight color="#64748B" size={24} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    backgroundColor: '#F0F9FF',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Outfit-SemiBold',
    fontWeight: '600',
    color: '#1E293B',
  },
  backButton: {
    position: 'absolute',
    padding: 8,
  },
  leftPlacement: {
    left: 20,
  },
  rightPlacement: {
    right: 20,
  },
});
