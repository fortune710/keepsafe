import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useProfileOperations } from '@/hooks/use-profile-operations';
import { useAuthContext } from '@/providers/auth-provider';
import { PhoneNumberInput } from '@/components/profile/phone-number-input';
import type { UpdateFormHandle, UpdateFormState } from './form-handle';

interface PhoneUpdateFormProps {
  currentValue: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  onClose: () => void;
  onStateChange?: (state: UpdateFormState) => void;
}

export const PhoneUpdateForm = forwardRef<UpdateFormHandle, PhoneUpdateFormProps>(
  ({ currentValue, onSuccess, onError, onClose, onStateChange }, ref) => {
    const { profile } = useAuthContext();
    const phoneNumber = profile?.phone_number ?? '';
    const [fullPhoneNumber, setFullPhoneNumber] = useState('');
    const [isValid, setIsValid] = useState(false);

    const { updateProfile, isLoading } = useProfileOperations();

    const handleSave = async () => {
      const result = await updateProfile({
        phone_number: fullPhoneNumber
      });

      if (result.success) {
        onSuccess && onSuccess(result.message);
        onClose();
      } else {
        onError && onError(result.message);
      }
    };

    useImperativeHandle(ref, () => ({ save: handleSave }));

    useEffect(() => {
      onStateChange?.({ isValid, isLoading });
    }, [isValid, isLoading, onStateChange]);

    return (
      <View style={styles.container}>
        <View style={styles.inputContainer}>
          <PhoneNumberInput
            initialValue={currentValue || phoneNumber}
            onChange={(payload) => {
              setFullPhoneNumber(payload.fullPhoneNumber);
              setIsValid(payload.isValid);
            }}
          />
        </View>
      </View>
    );
  }
);

PhoneUpdateForm.displayName = 'PhoneUpdateForm';

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  inputContainer: {},
});
