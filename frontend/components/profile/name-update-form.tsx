import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useProfileOperations } from '@/hooks/use-profile-operations';

interface NameUpdateFormProps {
  currentValue: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  onClose: () => void;
}

export function NameUpdateForm({ currentValue, onSuccess, onError, onClose }: NameUpdateFormProps) {
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
  nameInputs: {
    gap: 16,
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

