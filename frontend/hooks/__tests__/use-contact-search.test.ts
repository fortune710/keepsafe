import { renderHook, waitFor } from '@testing-library/react-native';
import { useContactSearch } from '../use-contact-search';
import { ContactsService } from '@/services/contacts-service';
import { FriendService } from '@/services/friend-service';

jest.mock('@/services/contacts-service');
jest.mock('@/services/friend-service');
jest.mock('@/lib/logger');

const mockContacts = [
    { name: 'John Doe', email: 'john@example.com', phoneNumber: '1234567890' },
    { name: 'Jane Smith', email: 'jane@example.com', phoneNumber: '0987654321' },
];

const mockKeepsafeUsers = [
    { id: 'user-1', name: 'John Doe', username: 'john@example.com', avatar: 'avatar-url' },
];

describe('useContactSearch', () => {
    beforeEach(() => {
        (ContactsService.getDeviceContacts as jest.Mock).mockResolvedValue(mockContacts);
        (FriendService.getSuggestedFriendsFromContacts as jest.Mock).mockResolvedValue(mockKeepsafeUsers);
    });

    it('initializes with empty results and loads data', async () => {
        const { result } = renderHook(() => useContactSearch(''));

        expect(result.current.isLoading).toBe(true);

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.results).toHaveLength(0);
    });

    it('filters contacts matching the query', async () => {
        const { result } = renderHook(() => useContactSearch('John'));

        await waitFor(() => {
            expect(result.current.results).toHaveLength(1);
        });

        expect(result.current.results[0].name).toBe('John Doe');
        expect(result.current.results[0].isOnKeepsafe).toBe(true);
    });

    it('identifies contacts not on Keepsafe', async () => {
        const { result } = renderHook(() => useContactSearch('Jane'));

        await waitFor(() => {
            expect(result.current.results).toHaveLength(1);
        });

        expect(result.current.results[0].name).toBe('Jane Smith');
        expect(result.current.results[0].isOnKeepsafe).toBe(false);
    });
});
