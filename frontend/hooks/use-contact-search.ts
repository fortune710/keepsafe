import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ContactsService } from '@/services/contacts-service';
import { FriendService } from '@/services/friend-service';
import { SuggestedFriend } from '@/types/friends';
import { deviceStorage } from '@/services/device-storage';
import { logger } from '@/lib/logger';
import { useSuggestedFriends } from './use-suggested-friends';

/**
 * Result of a contact search, including whether the contact is already on Keepsafe.
 */
export interface ContactSearchResult extends SuggestedFriend {
    isOnKeepsafe: boolean;
    phoneNumber?: string;
}

/**
 * Custom hook to search device contacts and identify Keepsafe users.
 * 
 * @param query - The search query string.
 * @returns An object containing the search results, loading state, and any error.
 */
export function useContactSearch(query: string) {
    //const { suggestedFriends } = useSuggestedFriends();
    const { data: allData, isLoading, error } = useQuery({
        queryKey: ['contact-search-base'],
        queryFn: async () => {
            const [contacts, keepsafeUsers] = await Promise.all([
                ContactsService.getDeviceContacts(),
                FriendService.getSuggestedFriendsFromContacts()
            ]);
            return { contacts, keepsafeUsers };
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const results = useMemo(() => {
        if (!query.trim() || !allData) return [];

        const lowerQuery = query.toLowerCase();
        const { contacts, keepsafeUsers } = allData;

        // 1. Filter device contacts
        const matchedContacts = contacts.filter(contact =>
            contact.name.toLowerCase().includes(lowerQuery) ||
            (contact.email && contact.email.toLowerCase().includes(lowerQuery)) ||
            (contact.phoneNumber && contact.phoneNumber.includes(query))
        );

        // 2. Map to results and check against Keepsafe users
        return matchedContacts.map(contact => {
            const keepsafeUser = keepsafeUsers.find(user =>
                (contact.email && user.email === contact.email) || // Assuming username or email match
                (user.name === contact.name) // fallback name match if no email
            );

            return {
                id: keepsafeUser?.id || `contact-${contact.name}-${contact.email || contact.phoneNumber}`,
                name: keepsafeUser?.name || contact.name,
                username: keepsafeUser?.username || contact.email || contact.phoneNumber || '',
                avatar: keepsafeUser?.avatar,
                isOnKeepsafe: !!keepsafeUser,
                phoneNumber: contact.phoneNumber
            } as ContactSearchResult;
        });
    }, [query, allData]);

    return {
        results,
        isLoading,
        error: error instanceof Error ? error : null
    };
}
