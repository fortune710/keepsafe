import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useProfileOperations } from '@/hooks/use-profile-operations';
import type { UpdateFormHandle, UpdateFormState } from './form-handle';

interface BioUpdateFormProps {
  currentValue: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  onClose: () => void;
  onStateChange?: (state: UpdateFormState) => void;
}

export const BioUpdateForm = forwardRef<UpdateFormHandle, BioUpdateFormProps>(
  ({ currentValue, onSuccess, onError, onClose, onStateChange }, ref) => {
    const [value, setValue] = useState(currentValue);

    const { updateProfile, isLoading } = useProfileOperations();

    const isValid = value.length <= 150;

    const handleSave = async () => {
      const result = await updateProfile({
        bio: value.trim()
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
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="Tell us about yourself..."
            placeholderTextColor="#94A3B8"
            value={value}
            onChangeText={setValue}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            autoCapitalize="sentences"
          />
          <Text style={styles.characterCount}>{value.length}/150</Text>
          {!isValid && value.length > 150 && (
            <Text style={styles.errorMessage}>
              Bio must be 150 characters or less
            </Text>
          )}
        </View>
      </View>
    );
  }
);

BioUpdateForm.displayName = 'BioUpdateForm';

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  inputContainer: {},
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
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 4,
  },
  errorMessage: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
});
