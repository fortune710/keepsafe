import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { useProfileOperations } from '@/hooks/use-profile-operations';
import type { UpdateFormHandle, UpdateFormState } from './form-handle';

interface NameUpdateFormProps {
  currentValue: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  onClose: () => void;
  onStateChange?: (state: UpdateFormState) => void;
}

export const NameUpdateForm = forwardRef<UpdateFormHandle, NameUpdateFormProps>(
  ({ currentValue, onSuccess, onError, onClose, onStateChange }, ref) => {
    const [firstName, setFirstName] = useState(() => {
      const nameParts = currentValue.split(' ');
      return nameParts[0] || '';
    });
    const [lastName, setLastName] = useState(() => {
      const nameParts = currentValue.split(' ');
      return nameParts.slice(1).join(' ') || '';
    });

    const { updateProfile, isLoading } = useProfileOperations();

    const isValid = firstName.trim().length > 0 && lastName.trim().length > 0;

    const handleSave = async () => {
      const result = await updateProfile({
        full_name: `${firstName.trim()} ${lastName.trim()}`
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
        <View style={styles.nameInputs}>
          <TextInput
            style={styles.input}
            placeholder="First name"
            placeholderTextColor="#94A3B8"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            placeholder="Last name"
            placeholderTextColor="#94A3B8"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />
        </View>
      </View>
    );
  }
);

NameUpdateForm.displayName = 'NameUpdateForm';

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  nameInputs: {
    gap: 16,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});
