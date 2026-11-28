import { act, renderHook } from '@testing-library/react-native';
import { Share } from 'react-native';
import { useFriendInvitation } from '../use-friend-invitation';

jest.mock('@/providers/auth-provider', () => ({ useAuthContext: () => ({ profile: { invite_code: 'ABC123' } }) }));
jest.mock('@/lib/utils', () => ({ generateDeepLinkUrl: () => 'https://example.test' }));

test('shares the invitation title, description, and link together', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  const { result } = renderHook(() => useFriendInvitation());
  await act(async () => { await result.current.shareInviteLink(); });
  expect(share).toHaveBeenCalledWith(
    {
      title: 'Join me on Keepsafe',
      message: "Join me on Keepsafe\n\nI'd love to share moments with you on Keepsafe! Join me using this link:\n\nhttps://example.test/invite/ABC123",
    },
    { subject: 'Join me on Keepsafe' },
  );
  share.mockRestore();
});
