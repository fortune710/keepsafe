import { waitFor } from '@testing-library/react-native';
import { retryEntryProcessing, scheduleEntryProcessing } from '../background-task-manager';
import { EntryService } from '../entry-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deviceStorage } from '../device-storage';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: null }) }) }) }),
    storage: {
      from: () => ({
        upload: jest.fn().mockResolvedValue({ data: { path: 'file.jpg' }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/file.jpg' } }),
      }),
    },
  },
}));
jest.mock('@/lib/utils', () => ({
  convertToArrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
  getContentType: () => 'image/jpeg',
  getFileExtension: () => 'jpg',
  getTimefromTimezone: () => new Date('2026-01-01T00:00:00Z'),
}));
jest.mock('../device-storage', () => ({
  deviceStorage: {
    getItem: jest.fn().mockResolvedValue([]),
    setItem: jest.fn().mockResolvedValue(undefined),
    updateEntry: jest.fn().mockResolvedValue(undefined),
    replaceEntry: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
  },
}));
jest.mock('../entry-service', () => ({
  EntryService: { createEntry: jest.fn().mockResolvedValue({ success: true, data: { profile: {} } }) },
}));

test('assigns queued entries to the user’s default diary', async () => {
  await scheduleEntryProcessing({
    entryId: 'entry-1', userId: 'user-1',
    capture: { id: 'capture-1', type: 'photo', uri: 'file://photo.jpg', timestamp: new Date() },
    textContent: '', isPrivate: true, isEveryone: false,
    selectedFriends: [], attachments: [], idempotencyKey: 'queue-1',
  });

  await waitFor(() => expect(EntryService.createEntry).toHaveBeenCalledWith(
    'user-1', expect.objectContaining({ user_id: 'user-1', diary_id: 'user-1' })
  ));
});

test('preserves the selected diary when processing an entry', async () => {
  await scheduleEntryProcessing({
    entryId: 'entry-2', userId: 'user-1', diaryId: 'diary-2',
    capture: { id: 'capture-2', type: 'photo', uri: 'file://photo.jpg', timestamp: new Date() },
    textContent: '', isPrivate: true, isEveryone: false,
    selectedFriends: [], attachments: [], idempotencyKey: 'queue-2',
  });

  await waitFor(() => expect(EntryService.createEntry).toHaveBeenCalledWith(
    'user-1', expect.objectContaining({ user_id: 'user-1', diary_id: 'diary-2' })
  ));
  await waitFor(async () => expect(await AsyncStorage.getItem('last_used_diary')).toBe('diary-2'));
});

test('preserves a non-default diary when retrying a failed upload', async () => {
  await retryEntryProcessing({
    entryId: 'entry-retry', userId: 'user-1', diaryId: 'diary-retry',
    capture: { id: 'capture-retry', type: 'photo', uri: 'file://photo.jpg', timestamp: new Date() },
    textContent: '', isPrivate: true, isEveryone: false,
    selectedFriends: [], attachments: [], idempotencyKey: 'queue-retry',
  });
  await waitFor(() => expect(EntryService.createEntry).toHaveBeenCalledWith(
    'user-1', expect.objectContaining({ id: 'entry-retry', diary_id: 'diary-retry' }),
  ));
});

test('completes the saved entry when remembering the last-used diary fails', async () => {
  const multiSet = jest.spyOn(AsyncStorage, 'multiSet').mockRejectedValueOnce(new Error('Storage unavailable'));
  try {
    await scheduleEntryProcessing({
      entryId: 'entry-storage-error', userId: 'user-1', diaryId: 'diary-3',
      capture: { id: 'capture-3', type: 'photo', uri: 'file://photo.jpg', timestamp: new Date() },
      textContent: '', isPrivate: true, isEveryone: false,
      selectedFriends: [], attachments: [], idempotencyKey: 'queue-storage-error',
    });
    await waitFor(() => expect(deviceStorage.replaceEntry).toHaveBeenCalledWith(
      'user-1', 'entry-storage-error', expect.objectContaining({ status: 'completed' }),
    ));
    expect(EntryService.createEntry).toHaveBeenCalledWith('user-1', expect.objectContaining({ diary_id: 'diary-3' }));
    expect(deviceStorage.emit).not.toHaveBeenCalledWith('entryStatusChanged', expect.objectContaining({ entryId: 'entry-storage-error', status: 'failed' }));
  } finally {
    multiSet.mockRestore();
  }
});

test('preserves the selected diary after entry creation fails and is retried', async () => {
  const task = {
    entryId: 'entry-failed', userId: 'user-1', diaryId: 'diary-failed',
    capture: { id: 'capture-failed', type: 'photo' as const, uri: 'file://photo.jpg', timestamp: new Date() },
    textContent: '', isPrivate: true, isEveryone: false,
    selectedFriends: [], attachments: [], idempotencyKey: 'queue-failed',
  };
  (EntryService.createEntry as jest.Mock).mockResolvedValueOnce({ success: false, error: 'offline' });
  await scheduleEntryProcessing(task);
  await waitFor(() => expect(EntryService.createEntry).toHaveBeenCalledWith('user-1', expect.objectContaining({ id: task.entryId, diary_id: task.diaryId })));
  await waitFor(() => expect(require('../device-storage').deviceStorage.updateEntry).toHaveBeenCalledWith('user-1', task.entryId, expect.objectContaining({ status: 'failed' })));
  await retryEntryProcessing(task);
  await waitFor(() => expect((EntryService.createEntry as jest.Mock).mock.calls.filter(([, entry]) => entry.id === task.entryId)).toHaveLength(2));
  expect((EntryService.createEntry as jest.Mock).mock.calls.filter(([, entry]) => entry.id === task.entryId).every(([, entry]) => entry.diary_id === task.diaryId)).toBe(true);
});
