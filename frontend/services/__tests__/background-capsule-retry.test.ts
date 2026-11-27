import { startForegroundQueueProcessor } from '../background-task-manager';
import { EntryService } from '../entry-service';
import { TimeCapsuleService } from '../time-capsule-service';

const mockTask = { entryId: 'capsule-entry', userId: 'user-1', diaryId: 'diary-capsule', capture: { id: 'capture-1', type: 'photo' as const, uri: 'file://photo.jpg', timestamp: new Date() }, textContent: '', isPrivate: true, isEveryone: false, selectedFriends: [], attachments: [], idempotencyKey: 'capsule-key', timeCapsule: { revealType: 'date' as const, unlockAt: '2030-01-01' } };
jest.mock('@/lib/supabase', () => ({ supabase: { storage: { from: () => ({ upload: jest.fn().mockResolvedValue({ data: { path: 'file.jpg' }, error: null }), getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/file.jpg' } }) }) } } }));
jest.mock('@/lib/utils', () => ({ convertToArrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)), getContentType: () => 'image/jpeg', getFileExtension: () => 'jpg', getTimefromTimezone: () => new Date('2026-01-01T00:00:00Z') }));
jest.mock('../device-storage', () => ({ deviceStorage: { getItem: jest.fn().mockImplementation(async () => [mockTask]), setItem: jest.fn().mockResolvedValue(undefined), updateEntry: jest.fn().mockResolvedValue(undefined), replaceEntry: jest.fn().mockResolvedValue(undefined), emit: jest.fn() } }));
jest.mock('../entry-service', () => ({ EntryService: { createEntry: jest.fn() } }));
jest.mock('../time-capsule-service', () => ({ TimeCapsuleService: { createEntryAndCapsule: jest.fn().mockResolvedValueOnce({ success: false }).mockImplementation(async (entry: any) => ({ success: true, data: entry })) } }));

test('a lost response retries the same atomic request with the selected diary', async () => {
  await startForegroundQueueProcessor();
  expect(EntryService.createEntry).not.toHaveBeenCalled();
  expect(TimeCapsuleService.createEntryAndCapsule).toHaveBeenCalledTimes(2);
  const calls = (TimeCapsuleService.createEntryAndCapsule as jest.Mock).mock.calls;
  expect(calls[0]).toEqual(calls[1]);
  expect(calls[0][0]).toEqual(expect.objectContaining({ id: 'capsule-entry', diary_id: 'diary-capsule', shared_with: [], shared_with_everyone: false }));
});
