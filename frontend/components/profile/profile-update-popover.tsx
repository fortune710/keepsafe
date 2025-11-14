import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, Alert, Image } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { X, Camera, Check } from 'lucide-react-native';
import { useProfileOperations } from '@/hooks/use-profile-operations';
import { useAuthContext } from '@/providers/auth-provider';

const { height } = Dimensions.get('window');

type UpdateType = 'name' | 'username' | 'bio' | 'avatar' | 'birthday' | 'phone';

interface ProfileUpdatePopoverProps {
  isVisible: boolean;
  updateType: UpdateType;
  currentValue?: string;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export default function ProfileUpdatePopover({ 
  isVisible, 
  updateType, 
  currentValue = '', 
  onClose, 
  onSuccess, 
  onError 
}: ProfileUpdatePopoverProps) {
  const [value, setValue] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  
  const { updateProfile, uploadAvatar, checkUsernameAvailability, isLoading } = useProfileOperations();
  const { profile } = useAuthContext();

  // Initialize values when popover opens
  useEffect(() => {
    if (isVisible) {
      if (updateType === 'name' && currentValue) {
        const nameParts = currentValue.split(' ');
        setFirstName(nameParts[0] || '');
        setLastName(nameParts.slice(1).join(' ') || '');
      } else {
        setValue(currentValue);
      }
      setValidationMessage('');
    }
  }, [isVisible, updateType, currentValue]);

  // Validation logic
  useEffect(() => {
    const validateInput = async () => {
      switch (updateType) {
        case 'name':
          setIsValid(firstName.trim().length > 0 && lastName.trim().length > 0);
          break;
        case 'username':
          if (value.trim().length === 0) {
            setIsValid(false);
            setValidationMessage('');
          } else if (value === currentValue) {
            setIsValid(false);
            setValidationMessage('Username unchanged');
          } else {
            const result = await checkUsernameAvailability(value);
            setIsValid(result.available);
            setValidationMessage(result.message);
          }
          break;
        case 'bio':
          setIsValid(value.length <= 150);
          setValidationMessage(value.length > 150 ? 'Bio must be 150 characters or less' : '');
          break;
        case 'birthday':
          // Simple date validation (YYYY-MM-DD format)
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          setIsValid(dateRegex.test(value) || value === '');
          setValidationMessage(!isValid && value ? 'Please use YYYY-MM-DD format' : '');
          break;
        case 'phone':
          // Simple phone validation
          const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
          setIsValid(phoneRegex.test(value) || value === '');
          setValidationMessage(!isValid && value ? 'Please enter a valid phone number' : '');
          break;
        default:
          setIsValid(value.trim().length > 0);
      }
    };

    if (updateType !== 'avatar') {
      validateInput();
    }
  }, [value, firstName, lastName, updateType, currentValue, checkUsernameAvailability]);

  // Swipe down gesture to dismiss
  const swipeDownGesture = Gesture.Pan()
    .onEnd((event) => {
      if (event.translationY > 100 && event.velocityY > 500) {
        onClose();
      }
    });

  const handleSave = async () => {
    let updateData: any = {};

    switch (updateType) {
      case 'name':
        updateData.full_name = `${firstName.trim()} ${lastName.trim()}`;
        break;
      case 'username':
        updateData.username = value.trim();
        break;
      case 'bio':
        updateData.bio = value.trim();
        break;
      case 'birthday':
        // This would need to be added to the database schema
        // For now, we'll store it in a JSON field or skip
        onError && onError('Birthday updates not yet implemented');
        return;
      case 'phone':
        // This would need to be added to the database schema
        // For now, we'll store it in a JSON field or skip
        onError && onError('Phone number updates not yet implemented');
        return;
    }

    const result = await updateProfile(updateData);
    
    if (result.success) {
      onSuccess &&  onSuccess(result.message);
      onClose();
    } else {
      onError && onError(result.message);
    }
  };

  const handleAvatarUpload = () => {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const result = await uploadAvatar(file);
        if (result.success && result.url) {
          const updateResult = await updateProfile({ avatar_url: result.url });
          if (updateResult.success) {
            onSuccess && onSuccess('Avatar updated successfully');
            onClose();
          } else {
            onError && onError(updateResult.message);
          }
        } else {
          onError && onError(result.message);
        }
      }
    };
    input.click();
  };

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

  const getPlaceholder = () => {
    switch (updateType) {
      case 'username': return 'Enter username';
      case 'bio': return 'Tell us about yourself...';
      case 'birthday': return 'YYYY-MM-DD';
      case 'phone': return '+1 (555) 123-4567';
      default: return 'Enter value';
    }
  };

  if (!isVisible) return null;

  return (
    <Animated.View 
      entering={SlideInDown.duration(300).springify().damping(20).stiffness(90)} 
      exiting={SlideOutDown.duration(300).springify().damping(20).stiffness(90)}
      style={styles.overlay}
      testID="profile-update-popover"
    >
      <TouchableOpacity style={styles.backdrop} onPress={onClose} />
      
      <GestureDetector gesture={swipeDownGesture}>
        <Animated.View style={styles.popover}>
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <Text style={styles.title}>{getTitle()}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color="#64748B" size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {updateType === 'avatar' ? (
              <View testID='profile-update-avatar' style={styles.avatarSection}>
                <View style={styles.currentAvatar}>
                  <Image 
                    source={{ uri: profile?.avatar_url || 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200' }}
                    style={styles.avatarImage}
                  />
                  <TouchableOpacity style={styles.cameraButton} onPress={handleAvatarUpload}>
                    <Camera color="white" size={16} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.avatarText}>Tap the camera icon to upload a new photo</Text>
              </View>
            ) : updateType === 'name' ? (
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
            ) : (
              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    updateType === 'bio' && styles.bioInput
                  ]}
                  placeholder={getPlaceholder()}
                  placeholderTextColor="#94A3B8"
                  value={value}
                  onChangeText={setValue}
                  multiline={updateType === 'bio'}
                  numberOfLines={updateType === 'bio' ? 3 : 1}
                  textAlignVertical={updateType === 'bio' ? 'top' : 'center'}
                  autoCapitalize={updateType === 'username' ? 'none' : 'sentences'}
                  keyboardType={updateType === 'phone' ? 'phone-pad' : 'default'}
                />
                {updateType === 'bio' && (
                  <Text style={styles.characterCount}>{value.length}/150</Text>
                )}
                {validationMessage ? (
                  <Text style={[
                    styles.validationMessage,
                    isValid ? styles.validMessage : styles.errorMessage
                  ]}>
                    {validationMessage}
                  </Text>
                ) : null}
              </View>
            )}

            {updateType !== 'avatar' && (
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
            )}
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  popover: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: height * 0.7,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 24,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  currentAvatar: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    padding: 8,
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  nameInputs: {
    gap: 16,
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