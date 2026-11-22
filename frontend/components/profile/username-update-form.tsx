import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useProfileOperations } from '@/hooks/use-profile-operations';
import type { UpdateFormHandle, UpdateFormState } from './form-handle';

interface UsernameUpdateFormProps {
  currentValue: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  onClose: () => void;
  onStateChange?: (state: UpdateFormState) => void;
}

export const UsernameUpdateForm = forwardRef<UpdateFormHandle, UsernameUpdateFormProps>(
  ({ currentValue, onSuccess, onError, onClose, onStateChange }, ref) => {
    const [value, setValue] = useState(currentValue);
    const [isValid, setIsValid] = useState(false);
    const [validationMessage, setValidationMessage] = useState('');

    const { updateProfile, checkUsernameAvailability, isLoading } = useProfileOperations();

    const validateUsername = useCallback(async (username: string) => {
      if (username.trim().length === 0) {
        setIsValid(false);
        setValidationMessage('');
        return;
      }

      if (username === currentValue) {
        setIsValid(false);
        setValidationMessage('Username unchanged');
        return;
      }

      const result = await checkUsernameAvailability(username);
      setIsValid(result.available);
      setValidationMessage(result.message);
    }, [currentValue, checkUsernameAvailability]);

    const handleTextChange = (text: string) => {
      setValue(text);
      validateUsername(text);
    };

    const handleSave = async () => {
      const result = await updateProfile({
        username: value.trim()
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
            style={styles.input}
            placeholder="Enter username"
            placeholderTextColor="#94A3B8"
            value={value}
            onChangeText={handleTextChange}
            autoCapitalize="none"
          />
          {validationMessage ? (
            <Text style={[
              styles.validationMessage,
              isValid ? styles.validMessage : styles.errorMessage
            ]}>
              {validationMessage}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }
);

UsernameUpdateForm.displayName = 'UsernameUpdateForm';

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
  validationMessage: {
    fontSize: 12,
    marginTop: 4,
  },
  validMessage: {
    color: '#10B981',
  },
  errorMessage: {
    color: '#EF4444',
  },
});
