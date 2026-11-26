import { waitFor } from '@testing-library/react-native';
import { startForegroundQueueProcessor, retryEntryProcessing } from '../background-task-manager';
import { EntryService } from '../entry-service';
import { TimeCapsuleService } from '../time-capsule-service';
let mockSavedEntry: any = null;
const mockTask = { entryId: 'capsule-entry', userId: 'user-1', diaryId: 'diary-capsule', capture: { id: 'capture-1', type: 'photo' as const, uri: 'file://photo.jpg', timestamp: new Date() }, textContent: '', isPrivate: true, isEveryone: false, selectedFriends: [], attachments: [], idempotencyKey: 'capsule-key', timeCapsule: { revealType: 'date' as const, unlockAt: '2030-01-01' } };
jest.mock('@/lib/supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: jest.fn().mockImplementation(async () => ({ data: mockSavedEntry })) }) }) }), storage: { from: () => ({ upload: jest.fn().mockResolvedValue({ data: { path: 'file.jpg' }, error: null }), getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/file.jpg' } }) }) } } }));
jest.mock('@/lib/utils', () => ({ convertToArrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)), getContentType: () => 'image/jpeg', getFileExtension: () => 'jpg', getTimefromTimezone: () => new Date('2026-01-01T00:00:00Z') }));
jest.mock('../device-storage', () => ({ deviceStorage: { getItem: jest.fn().mockImplementation(async () => [mockTask]), setItem: jest.fn().mockResolvedValue(undefined), updateEntry: jest.fn().mockResolvedValue(undefined), replaceEntry: jest.fn().mockResolvedValue(undefined), emit: jest.fn() } }));
jest.mock('../entry-service', () => ({ EntryService: { createEntry: jest.fn().mockImplementation(async (_user: string, entry: any) => { mockSavedEntry = entry; return { success: true, data: entry }; }) } }));
jest.mock('../time-capsule-service', () => ({ TimeCapsuleService: { createCapsule: jest.fn().mockResolvedValueOnce({ success: false }).mockResolvedValueOnce({ success: false }).mockResolvedValueOnce({ success: false }).mockResolvedValue({ success: true }) } }));
test('capsule retry retains the selected diary and reuses the existing entry', async () => {
  await startForegroundQueueProcessor();
  expect(EntryService.createEntry).toHaveBeenCalledWith('user-1', expect.objectContaining({ id: 'capsule-entry', diary_id: 'diary-capsule' }));
  await retryEntryProcessing(mockTask);
  await waitFor(() => expect(TimeCapsuleService.createCapsule).toHaveBeenCalledTimes(4));
  expect(EntryService.createEntry).toHaveBeenCalledTimes(1);
  expect(mockSavedEntry.diary_id).toBe('diary-capsule');
});
