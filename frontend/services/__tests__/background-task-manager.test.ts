import { waitFor } from '@testing-library/react-native';
import { scheduleEntryProcessing } from '../background-task-manager';
import { EntryService } from '../entry-service';

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
