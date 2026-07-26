import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import { X } from 'lucide-react-native';
import { NameUpdateForm } from './name-update-form';
import { UsernameUpdateForm } from './username-update-form';
import { BioUpdateForm } from './bio-update-form';
import { AvatarUpdateForm } from './avatar-update-form';
import { BirthdayUpdateForm } from './birthday-update-form';
import { PhoneUpdateForm } from './phone-update-form';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { scale, verticalScale } from 'react-native-size-matters';

type UpdateType = 'name' | 'username' | 'bio' | 'avatar' | 'birthday' | 'phone';

interface ProfileUpdatePopoverProps {
  isVisible: boolean;
  updateType: UpdateType;
  currentValue?: string;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

/**
 * Uses the shared `BottomSheet` component so it matches the style and layout
 * used by the onboarding bottom sheets and the phone number bottom sheet.
 */
export default function ProfileUpdatePopover({
  isVisible,
  updateType,
  currentValue = '',
  onClose,
  onSuccess,
  onError
}: ProfileUpdatePopoverProps) {
  const getTitle = () => {
    switch (updateType) {
      case 'name': return 'Update Name';
      case 'username': return 'Update Username';
      case 'bio': return 'Update Bio';
      case 'avatar': return 'Update Avatar';
      case 'birthday': return 'Update Birthday';
      case 'phone': return 'Update Phone';
      default: return 'Update Profile';
    }
  };

  const renderForm = () => {
    switch (updateType) {
      case 'name':
        return <NameUpdateForm currentValue={currentValue} onSuccess={onSuccess} onError={onError} onClose={onClose} />;
      case 'username':
        return <UsernameUpdateForm currentValue={currentValue} onSuccess={onSuccess} onError={onError} onClose={onClose} />;
      case 'bio':
        return <BioUpdateForm currentValue={currentValue} onSuccess={onSuccess} onError={onError} onClose={onClose} />;
      case 'avatar':
        return <AvatarUpdateForm onSuccess={onSuccess} onError={onError} onClose={onClose} />;
      case 'birthday':
        return <BirthdayUpdateForm currentValue={currentValue} onSuccess={onSuccess} onError={onError} onClose={onClose} />;
      case 'phone':
        return <PhoneUpdateForm currentValue={currentValue} onSuccess={onSuccess} onError={onError} onClose={onClose} />;
      default:
        return null;
    }
  };

  return (
    <BottomSheet visible={isVisible} onClose={onClose} maxHeight="90%">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{getTitle()}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={12}>
            <X color="#64748B" size={20} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {renderForm()}
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    flex: 1,
    fontSize: scale(17),
    fontFamily: 'Outfit-SemiBold',
    color: '#1E293B',
    marginRight: scale(12),
  },
  closeButton: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(20),
  },
});
