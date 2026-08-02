import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { X, Check } from 'lucide-react-native';
import { NameUpdateForm } from './name-update-form';
import { UsernameUpdateForm } from './username-update-form';
import { BioUpdateForm } from './bio-update-form';
import { AvatarUpdateForm } from './avatar-update-form';
import { BirthdayUpdateForm } from './birthday-update-form';
import { PhoneUpdateForm } from './phone-update-form';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { scale, verticalScale } from 'react-native-size-matters';
import type { UpdateFormHandle, UpdateFormState } from './form-handle';

type UpdateType = 'name' | 'username' | 'bio' | 'avatar' | 'birthday' | 'phone';

interface ProfileUpdatePopoverProps {
  isVisible: boolean;
  updateType: UpdateType;
  currentValue?: string;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

const INITIAL_FORM_STATE: UpdateFormState = { isValid: false, isLoading: false };

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
  const formRef = useRef<UpdateFormHandle>(null);
  const [formState, setFormState] = useState<UpdateFormState>(INITIAL_FORM_STATE);

  useEffect(() => {
    setFormState(INITIAL_FORM_STATE);
  }, [updateType]);

  const handleStateChange = useCallback((next: UpdateFormState) => {
    setFormState((prev) =>
      prev.isValid === next.isValid && prev.isLoading === next.isLoading ? prev : next
    );
  }, []);

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
        return <NameUpdateForm ref={formRef} currentValue={currentValue} onSuccess={onSuccess} onError={onError} onClose={onClose} onStateChange={handleStateChange} />;
      case 'username':
        return <UsernameUpdateForm ref={formRef} currentValue={currentValue} onSuccess={onSuccess} onError={onError} onClose={onClose} onStateChange={handleStateChange} />;
      case 'bio':
        return <BioUpdateForm ref={formRef} currentValue={currentValue} onSuccess={onSuccess} onError={onError} onClose={onClose} onStateChange={handleStateChange} />;
      case 'avatar':
        return <AvatarUpdateForm ref={formRef} onSuccess={onSuccess} onError={onError} onClose={onClose} onStateChange={handleStateChange} />;
      case 'birthday':
        return <BirthdayUpdateForm ref={formRef} currentValue={currentValue} onSuccess={onSuccess} onError={onError} onClose={onClose} onStateChange={handleStateChange} />;
      case 'phone':
        return <PhoneUpdateForm ref={formRef} currentValue={currentValue} onSuccess={onSuccess} onError={onError} onClose={onClose} onStateChange={handleStateChange} />;
      default:
        return null;
    }
  };

  return (
    <BottomSheet visible={isVisible} onClose={onClose} maxHeight="90%">
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

      <View style={styles.footer}>
        <Button
          onPress={() => formRef.current?.save()}
          disabled={!formState.isValid}
          loading={formState.isLoading}
        >
          <Check color="white" size={20} />
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </Button>
      </View>
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
    paddingBottom: verticalScale(12),
  },
  footer: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(20),
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
