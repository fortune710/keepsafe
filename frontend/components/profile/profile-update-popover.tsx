import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, ScrollView } from 'react-native';
import Animated, { SlideInDown, SlideOutDown, useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { X } from 'lucide-react-native';
import { NameUpdateForm } from './name-update-form';
import { UsernameUpdateForm } from './username-update-form';
import { BioUpdateForm } from './bio-update-form';
import { AvatarUpdateForm } from './avatar-update-form';
import { BirthdayUpdateForm } from './birthday-update-form';
import { PhoneUpdateForm } from './phone-update-form';

const { height } = Dimensions.get('window');
const BASE_PADDING_BOTTOM = 40;

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
  const keyboard = useAnimatedKeyboard();

  const animatedStyle = useAnimatedStyle(() => ({
    paddingBottom: BASE_PADDING_BOTTOM + keyboard.height.value,
  }));

  // Swipe down gesture to dismiss
  const swipeDownGesture = Gesture.Pan()
    .onEnd((event) => {
      if (event.translationY > 100 && event.velocityY > 500) {
        onClose();
      }
    });

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
        <Animated.View style={[styles.popover, animatedStyle]}>
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <Text style={styles.title}>{getTitle()}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
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
    paddingBottom: BASE_PADDING_BOTTOM,
    maxHeight: height * 0.9, // Increased max height to allow for keyboard
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
  },
});