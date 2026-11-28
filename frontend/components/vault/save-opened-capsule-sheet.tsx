import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Check, ChevronLeft, Lock, Users, X } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { DiaryCoverVisual } from '@/components/vault/diary-cover-card';
import { useDiaries } from '@/hooks/use-diaries';
import { useFriends } from '@/hooks/use-friends';
import { useAuthContext } from '@/providers/auth-provider';
import { TimeCapsuleWithEntry } from '@/types/time-capsule';
import { TimeCapsuleService } from '@/services/time-capsule-service';
import { getDefaultAvatarUrl } from '@/lib/utils';
import { deviceStorage } from '@/services/device-storage';

type Sharing = 'private' | 'everyone' | 'friends';

export function SaveOpenedCapsuleSheet({ capsule, onClose }: { capsule: TimeCapsuleWithEntry | null; onClose: () => void }) {
  const { user } = useAuthContext();
  const { diaries, isLoading } = useDiaries();
  const { friends } = useFriends(user?.id);
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [diaryId, setDiaryId] = useState<string | null>(null);
  const previouslyShared = (capsule?.entry?.shared_with ?? []).filter(id => id !== user?.id);
  const [sharing, setSharing] = useState<Sharing>(capsule?.entry?.shared_with_everyone ? 'everyone' : previouslyShared.length ? 'friends' : 'private');
  const [selectedFriends, setSelectedFriends] = useState<string[]>(previouslyShared);
  const effectiveDiaryId = diaryId ?? (diaries.some(d => d.id === capsule?.entry?.diary_id) ? capsule?.entry?.diary_id : diaries.find(d => d.id === user?.id)?.id) ?? null;
  const close = () => { onClose(); setStep(1); setDiaryId(null); setSharing('private'); setSelectedFriends([]); };
  const save = useMutation({
    mutationFn: async () => {
      if (!capsule || !effectiveDiaryId) throw new Error('Choose a diary first.');
      return TimeCapsuleService.saveOpenedCapsule({ capsuleId: capsule.id, diaryId: effectiveDiaryId, sharing, friendIds: sharing === 'friends' ? selectedFriends : [] });
    },
    onSuccess: async (entry) => {
      if (user?.id) {
        try {
          const oldDiaryId = capsule?.entry?.diary_id;
          if (oldDiaryId && oldDiaryId !== entry.diary_id) {
            const oldEntries = await deviceStorage.getDiaryEntries(user.id, oldDiaryId);
            if (oldEntries) await deviceStorage.setDiaryEntries(user.id, oldDiaryId, oldEntries.filter(item => item.id !== entry.id));
          }
          await deviceStorage.updateEntry(user.id, entry.id, entry);
        } catch {
          // Server data is authoritative; a cache failure must not turn a saved entry into an error.
        }
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['time-capsules', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['user-entries', user?.id] }),
      ]);
      close();
    },
    onError: (error) => Alert.alert('Unable to save', error instanceof Error ? error.message : 'Please try again.'),
  });
  const toggleFriend = (id: string) => {
    setSharing('friends');
    setSelectedFriends(current => current.includes(id) ? current.filter(friendId => friendId !== id) : [...current, id]);
  };
  const selectableFriends = friends.filter(f => !!f.friend_profile?.id);
  return (
    <BottomSheet visible={!!capsule} onClose={close} height="65%" maxHeight="65%">
      <View style={styles.container}>
        <View style={styles.header}>
          {step === 2 ? <TouchableOpacity onPress={() => setStep(1)} accessibilityRole="button" accessibilityLabel="Back to diaries"><ChevronLeft size={23} color="#64748B" /></TouchableOpacity> : null}
          <Text style={styles.title}>{step === 1 ? 'Choose a diary' : 'Share with'}</Text>
          <Text style={styles.step}>Step {step} of 2</Text>
          <TouchableOpacity onPress={close} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}><X size={22} color="#64748B" /></TouchableOpacity>
        </View>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {step === 1 ? (
            <>
              {isLoading ? <Text style={styles.hint}>Loading diaries…</Text> : null}
              {!isLoading && !diaries.length ? <Text style={styles.hint}>No diaries available.</Text> : null}
              {diaries.map(diary => <TouchableOpacity key={diary.id} onPress={() => setDiaryId(diary.id)} style={[styles.row, diary.id === effectiveDiaryId && styles.selected]} accessibilityRole="radio" accessibilityState={{ checked: diary.id === effectiveDiaryId }}>
                <DiaryCoverVisual color={diary.cover_color || diary.color || '#8B5CF6'} diaryStyle={diary.style} borderRadius={4} style={styles.cover} />
                <Text style={styles.rowText}>{diary.name}</Text><Selection checked={diary.id === effectiveDiaryId} />
              </TouchableOpacity>)}
            </>
          ) : (
            <>
              <Text style={styles.label}>SHARING MODE</Text>
              {(['private', 'everyone'] as const).map(mode => <TouchableOpacity key={mode} style={styles.row} onPress={() => { setSharing(mode); setSelectedFriends([]); }} accessibilityRole="radio" accessibilityState={{ checked: sharing === mode }}>
                <View style={styles.modeIcon}>{mode === 'private' ? <Lock size={20} color="#7C3AED" /> : <Users size={20} color="#7C3AED" />}</View>
                <View style={styles.rowBody}><Text style={styles.rowText}>{mode === 'private' ? 'Private' : 'Everyone'}</Text><Text style={styles.hint}>{mode === 'private' ? 'Only you can see this entry' : 'Share with everyone'}</Text></View><Selection checked={sharing === mode} />
              </TouchableOpacity>)}
              <Text style={styles.label}>SELECT FRIENDS</Text>
              {selectableFriends.map(({ friend_profile: friend }) => <TouchableOpacity key={friend.id} style={styles.row} onPress={() => toggleFriend(friend.id)} accessibilityRole="checkbox" accessibilityState={{ checked: sharing === 'friends' && selectedFriends.includes(friend.id) }}>
                <Image source={{ uri: friend.avatar_url || getDefaultAvatarUrl(friend.full_name ?? '', 'svg') }} style={styles.avatar} /><Text style={styles.rowText}>{friend.full_name || friend.username || 'Friend'}</Text><Selection checked={sharing === 'friends' && selectedFriends.includes(friend.id)} />
              </TouchableOpacity>)}
              {!selectableFriends.length ? <Text style={styles.hint}>No friends available yet.</Text> : null}
            </>
          )}
        </ScrollView>
        <TouchableOpacity style={[styles.button, (save.isPending || (step === 1 && !effectiveDiaryId) || (step === 2 && sharing === 'friends' && !selectedFriends.length)) && styles.disabled]} disabled={save.isPending || (step === 1 && !effectiveDiaryId) || (step === 2 && sharing === 'friends' && !selectedFriends.length)} onPress={() => step === 1 ? setStep(2) : save.mutate()} accessibilityRole="button">
          <Text style={styles.buttonText}>{step === 1 ? 'Next' : save.isPending ? 'Saving…' : 'Save to diary'}</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

function Selection({ checked }: { checked: boolean }) { return <View style={[styles.check, checked && styles.checkSelected]}>{checked ? <Check size={16} color="white" /> : null}</View>; }

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  title: { flex: 1, fontSize: 22, fontFamily: 'Figtree-SemiBold', color: '#1E293B' },
  step: { color: '#64748B', fontFamily: 'Figtree-SemiBold', fontSize: 12, backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  list: { flex: 1 }, listContent: { paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingHorizontal: 10, paddingVertical: 8, gap: 14, borderRadius: 14 },
  selected: { backgroundColor: '#F1EBFF' }, rowBody: { flex: 1 },
  rowText: { flex: 1, color: '#1E293B', fontSize: 16, fontFamily: 'Figtree-SemiBold' },
  hint: { color: '#64748B', fontSize: 13, fontFamily: 'Figtree-Regular' },
  label: { marginTop: 12, marginBottom: 4, fontSize: 11, color: '#64748B', fontFamily: 'Figtree-SemiBold', letterSpacing: 0.6 },
  cover: { width: 36, height: 48 }, avatar: { width: 42, height: 42, borderRadius: 21 },
  modeIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#F1EBFF', alignItems: 'center', justifyContent: 'center' },
  check: { width: 23, height: 23, borderRadius: 12, borderWidth: 1.5, borderColor: '#A1AEC1', alignItems: 'center', justifyContent: 'center' },
  checkSelected: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  button: { backgroundColor: '#8B5CF6', borderRadius: 28, alignItems: 'center', paddingVertical: 16, marginTop: 12 },
  disabled: { opacity: 0.5 }, buttonText: { color: 'white', fontSize: 16, fontFamily: 'Figtree-SemiBold' },
});
