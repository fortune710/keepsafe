import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Share, UserPlus } from 'lucide-react-native';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { Colors } from '@/lib/constants';

interface AddFriendsSectionProps {
  showModal: () => void;
}

export default function AddFriendsSection({ showModal }: AddFriendsSectionProps) {
  return (
    <View style={styles.addFriendsSection}>
      <View style={styles.sectionHeader}>
        <UserPlus color="#8B5CF6" size={16} />
        <Text style={styles.sectionTitle}>Find More Friends</Text>
      </View>
      
      <TouchableOpacity style={styles.shareButton} onPress={showModal}>
        <Share color={Colors.white} size={scale(16)} />
        <Text style={styles.shareButtonText}>Share Your Link</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  addFriendsSection: {
    marginBottom: verticalScale(10),
    marginTop: verticalScale(20),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: moderateScale(14),
    fontFamily: 'Outfit-SemiBold',
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    // Ensure minimum touch target (iOS guideline: 44pt)
    minHeight: 44,
  },
  shareButtonText: {
    color: Colors.white,
    fontSize: moderateScale(14),
    fontFamily: 'Outfit-Bold',
    fontWeight: '600',
    marginLeft: 8,
  },
});
