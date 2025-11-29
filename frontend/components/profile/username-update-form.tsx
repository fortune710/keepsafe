import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useProfileOperations } from '@/hooks/use-profile-operations';

interface UsernameUpdateFormProps {
  currentValue: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  onClose: () => void;
}

export function UsernameUpdateForm({ currentValue, onSuccess, onError, onClose }: UsernameUpdateFormProps) {
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

      <TouchableOpacity 
        style={[
          styles.saveButton,
          (!isValid || isLoading) && styles.saveButtonDisabled
        ]} 
        onPress={handleSave}
        disabled={!isValid || isLoading}
      >
        <Check color="white" size={20} />
        <Text style={styles.saveButtonText}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
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
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

