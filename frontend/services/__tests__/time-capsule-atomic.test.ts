import { TimeCapsuleService } from '../time-capsule-service';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));
jest.mock('@/constants/posthog', () => ({ posthog: { capture: jest.fn() } }));
jest.mock('../streak-service', () => ({ StreakService: { loadStreakData: jest.fn(), updateStreak: jest.fn() } }));

const entry = { id: '11111111-1111-4111-8111-111111111111', user_id: '22222222-2222-4222-8222-222222222222', diary_id: '33333333-3333-4333-8333-333333333333', type: 'photo' as const, attachments: [], shared_with: [], shared_with_everyone: false };
const draft = { revealType: 'condition' as const, conditionLabel: 'A milestone' };

test('calls the atomic RPC with the entry and capsule together', async () => {
  (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: { entry, created: false }, error: null });
  await expect(TimeCapsuleService.createEntryAndCapsule(entry, draft)).resolves.toEqual({ success: true, data: entry });
  expect(supabase.rpc).toHaveBeenCalledWith('create_entry_time_capsule', { p_entry: entry, p_capsule: { reveal_type: 'condition', unlock_at: null, condition_label: 'A milestone' } });
});

test('rejects invalid requests without calling the database', async () => {
  (supabase.rpc as jest.Mock).mockClear();
  const result = await TimeCapsuleService.createEntryAndCapsule({ ...entry, diary_id: 'invalid' }, draft);
  expect(result.success).toBe(false);
  expect(supabase.rpc).not.toHaveBeenCalled();
});
