import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useProfileOperations } from '@/hooks/use-profile-operations';
import { useAuthContext } from '@/providers/auth-provider';
import { PhoneNumberInput } from '@/components/profile/phone-number-input';

interface PhoneUpdateFormProps {
  currentValue: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  onClose: () => void;
}

export function PhoneUpdateForm({ currentValue, onSuccess, onError, onClose }: PhoneUpdateFormProps) {
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

