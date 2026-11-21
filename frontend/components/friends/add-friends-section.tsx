import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { UserAddIcon } from '@/components/icons/user-add-icon';
import { ShareIcon } from '@/components/icons/share-icon';
import { LinkIcon } from '@/components/icons/link-icon';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { Colors } from '@/lib/constants';
import { useFriendInvitation } from '@/hooks/use-friend-invitation';
import { useToast } from '@/hooks/use-toast';

// Near-black, but not pure black, so the icons read as dark rather than harsh.
const ICON_COLOR = '#0F172A';

export default function AddFriendsSection() {
  const { copyInviteLink, shareInviteLink } = useFriendInvitation();
  const { toast } = useToast();

  const handleCopyLink = async () => {
    const success = await copyInviteLink();
    toast(
      success ? 'Invite link copied to clipboard' : 'Failed to copy invite link',
      success ? 'success' : 'error',
    );
  };

  const handleShareLink = async () => {
    try {
      await shareInviteLink();
    } catch {
      toast('Failed to share invite link', 'error');
    }
  };

  return (
    <View style={styles.addFriendsSection}>
      <View style={styles.sectionHeader}>
        <UserAddIcon color="#64748B" size={26} strokeWidth={1.25} />
        <Text style={styles.sectionTitle}>Find More Friends</Text>
      </View>

      <TouchableOpacity style={styles.shareButton} onPress={handleShareLink}>
        <View style={styles.shareButtonLeft}>
          <View style={styles.iconCircle}>
            <ShareIcon color={ICON_COLOR} size={scale(20)} strokeWidth={2} />
          </View>
          <Text style={styles.shareButtonText}>Share Your Link</Text>
        </View>
        <ChevronRight color={Colors.textMuted} size={20} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.copyButton} onPress={handleCopyLink}>
        <View style={styles.copyButtonLeft}>
          <View style={styles.iconCircle}>
            <LinkIcon color={ICON_COLOR} size={scale(20)} strokeWidth={2.2} />
          </View>
          <Text style={styles.copyButtonText}>Copy Link</Text>
        </View>
        <ChevronRight color={Colors.textMuted} size={20} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  addFriendsSection: {
    marginBottom: verticalScale(10),
    marginTop: verticalScale(20),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: moderateScale(14),
    fontFamily: 'Figtree-SemiBold',
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 12,
    // Ensure minimum touch target (iOS guideline: 44pt)
    minHeight: 44,
    marginBottom: 0,
  },
  shareButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareButtonText: {
    color: Colors.text,
    fontSize: moderateScale(14),
    fontFamily: 'Figtree-Bold',
    fontWeight: '600',
    marginLeft: 10,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  copyButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyButtonText: {
    color: Colors.text,
    fontSize: moderateScale(14),
    fontFamily: 'Figtree-Bold',
    fontWeight: '600',
    marginLeft: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
