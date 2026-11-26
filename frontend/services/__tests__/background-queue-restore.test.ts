import { waitFor } from '@testing-library/react-native';
import { startForegroundQueueProcessor } from '../background-task-manager';
import { EntryService } from '../entry-service';
jest.mock('@/lib/supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: null }) }) }) }), storage: { from: () => ({ upload: jest.fn().mockResolvedValue({ data: { path: 'file.jpg' }, error: null }), getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/file.jpg' } }) }) } } }));
jest.mock('@/lib/utils', () => ({ convertToArrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)), getContentType: () => 'image/jpeg', getFileExtension: () => 'jpg', getTimefromTimezone: () => new Date('2026-01-01T00:00:00Z') }));
jest.mock('../device-storage', () => ({ deviceStorage: { getItem: jest.fn().mockResolvedValue([{ entryId: 'restored-entry', userId: 'user-1', diaryId: 'diary-restored', capture: { id: 'capture-1', type: 'photo', uri: 'file://photo.jpg', timestamp: '2026-01-01T00:00:00Z' }, textContent: '', isPrivate: true, isEveryone: false, selectedFriends: [], attachments: [], idempotencyKey: 'restored-key' }]), setItem: jest.fn().mockResolvedValue(undefined), updateEntry: jest.fn().mockResolvedValue(undefined), replaceEntry: jest.fn().mockResolvedValue(undefined), emit: jest.fn() } }));
jest.mock('../entry-service', () => ({ EntryService: { createEntry: jest.fn().mockResolvedValue({ success: true, data: { profile: {} } }) } }));
test('restored queue inserts into the originally selected diary', async () => {
  await startForegroundQueueProcessor();
  await waitFor(() => expect(EntryService.createEntry).toHaveBeenCalledWith('user-1', expect.objectContaining({ id: 'restored-entry', diary_id: 'diary-restored' })));
});
