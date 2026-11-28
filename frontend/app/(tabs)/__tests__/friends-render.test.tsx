import React from 'react';
import { render } from '@testing-library/react-native';
import FriendsScreen from '../friends';

jest.mock('expo-router', () => ({ router: { back: jest.fn() }, useLocalSearchParams: () => ({}) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: any) => children }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/components/icons/users-icon', () => ({ UsersIcon: () => null }));
jest.mock('@/providers/auth-provider', () => ({ useAuthContext: () => ({ profile: { id: 'user-1' } }) }));
jest.mock('@/hooks/use-friends', () => ({ useFriends: () => ({
  friends: [{ id: 'friendship-1', status: 'accepted', updated_at: '2026-01-01', friend_profile: { id: 'friend-1', full_name: 'Alex Taylor', username: 'alex', email: 'alex@example.test' } }],
  pendingRequests: [], isLoading: false, error: null, refetch: jest.fn(), refreshFriends: jest.fn(),
}) }));
jest.mock('@/hooks/use-suggested-friends', () => ({ useSuggestedFriends: () => ({ suggestedFriends: [] }) }));
jest.mock('@/hooks/use-friend-invitation', () => ({ useFriendInvitation: () => ({ shareInviteLink: jest.fn() }) }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/hooks/use-responsive', () => ({ useResponsive: () => ({}) }));
jest.mock('@/hooks/use-contact-search', () => ({ useContactSearch: () => ({ results: [], isLoading: false }) }));
jest.mock('@/services/local-notification-service', () => ({ LocalNotificationService: {} }));
jest.mock('@/components/friends/suggested-friends-list', () => () => null);
jest.mock('@/components/friends/add-friends-section', () => () => null);
jest.mock('@/components/friends/contact-search-view', () => ({ ContactSearchView: () => null }));
jest.mock('@/components/friends/friends-search-view', () => ({ FriendsSearchView: () => null }));
jest.mock('@/components/ui/header-fade', () => ({ HeaderFade: () => null }));

test('renders the page header and existing friend rows', () => {
  const screen = render(<FriendsScreen />);
  expect(screen.getByText('Friends')).toBeTruthy();
  expect(screen.getByText('Your Friends')).toBeTruthy();
  expect(screen.getByText('Alex Taylor')).toBeTruthy();
  expect(screen.getByText('alex')).toBeTruthy();
});
