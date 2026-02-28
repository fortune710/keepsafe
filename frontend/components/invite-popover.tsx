import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert } from 'react-native';
import Animated, { SlideInDown, SlideOutDown, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Copy, Share, X } from 'lucide-react-native';
import { useFriendInvitation } from '@/hooks/use-friend-invitation';
import { verticalScale } from 'react-native-size-matters';

const { height } = Dimensions.get('window');

interface InvitePopoverProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function InvitePopover({ isVisible, onClose }: InvitePopoverProps) {
  const { inviteLink, copyInviteLink, shareInviteLink } = useFriendInvitation();
  
  const popoverHeight = useSharedValue(height * 0.6);

  const animatedPopoverStyle = useAnimatedStyle(() => {
    return {
      maxHeight: popoverHeight.value,
    }
  })


  // Swipe down gesture to dismiss
  const swipeDownGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow downward swipes
      if (event.translationY > 0) {
        // Handle swipe animation here if needed
        //popoverHeight.value = popoverHeight.value - (event.translationY * 1.8)
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100 && event.velocityY > 500) {
        onClose();
      }
    });

  const handleCopyLink = async () => {
    const success = await copyInviteLink();
    if (success) {
      Alert.alert('Copied!', 'Invite link copied to clipboard');
    } else {
      Alert.alert('Error', 'Failed to copy invite link');
    }
  };

  const handleShareLink = async () => {
    try {
      await shareInviteLink();
    } catch (error) {
      let errorMessage = 'Failed to share invite link';
      
      if (error instanceof Error) {
        switch (error.message) {
          case 'SHARE_PERMISSION_DENIED':
            errorMessage = 'Sharing is not allowed in this browser context. Please copy the link instead.';
            break;
          case 'SHARE_NOT_SUPPORTED':
            errorMessage = 'Sharing is not supported in this browser. Please copy the link instead.';
            break;
          case 'SHARE_FAILED':
            errorMessage = 'Failed to share invite link. Please try copying the link instead.';
            break;
        }
      }
      
      Alert.alert('Sharing Unavailable', errorMessage);
    }
  };

  if (!isVisible) return null;

  return (
    <Animated.View 
      style={styles.overlay}
    >
      <TouchableOpacity style={styles.backdrop} onPress={onClose} />
      
      <GestureDetector gesture={swipeDownGesture}>
        <Animated.View 
          style={[styles.popover, animatedPopoverStyle]}
          entering={SlideInDown.duration(300).springify().damping(27).stiffness(90)} 
          exiting={SlideOutDown.duration(300).springify().damping(20).stiffness(90)}
        >
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <Text style={styles.title}>Invite Friends</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color="#64748B" size={20} />
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            Share your invite link with friends to connect on Keepsafe
          </Text>

          
          <View style={styles.linkContainer}>
            <View style={styles.linkBox}>
              <Text style={styles.linkText} numberOfLines={1}>
                {inviteLink}
              </Text>
              <TouchableOpacity style={styles.copyButton} onPress={handleCopyLink}>
                <Copy color="#8B5CF6" size={16} />
              </TouchableOpacity>
            </View>
            
          </View>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.shareButton} 
              onPress={handleShareLink}
              disabled={!inviteLink}
            >
              <Share color="white" size={20} />
              <Text style={styles.shareButtonText}>Share Link</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  listContainer: { 
    maxHeight: verticalScale(450), 
    width: '100%',
    paddingHorizontal: 24,
  },
  suggestedFriendsText: {
    fontSize: 16,
    fontWeight: '500',
    marginVertical: 12
  },
  overlay: {
    position: 'absolute',
    top: verticalScale(-50),
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
    bottom: verticalScale(-40),
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: verticalScale(80),
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
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
    lineHeight: 20,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
  errorContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  linkContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: 8,
    marginLeft: 8,
  },
  actions: {
    paddingHorizontal: 24,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
