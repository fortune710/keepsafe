import React from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import FriendSearchBar from '@/components/friend-search-bar';
import { ContactSearchItem } from './contact-search-item';
import { ContactSearchResult } from '@/hooks/use-contact-search';

interface ContactSearchViewProps {
    searchQuery: string;
    onSearch: (query: string) => void;
    onClose: () => void;
    isContactSearchLoading: boolean;
    contactResults: ContactSearchResult[];
    onAdd: (id: string) => void;
    onInvite: (contact: ContactSearchResult) => void;
}

/**
 * View for searching device contacts and Keepsafe users.
 * Uses ES5 function declaration for the component.
 */
export function ContactSearchView(props: ContactSearchViewProps) {
    const {
        onSearch,
        onClose,
        isContactSearchLoading,
        contactResults,
        onAdd,
        onInvite
    } = props;

    return (
        <>
            <FriendSearchBar
                isVisible={true}
                onClose={onClose}
                onSearch={onSearch}
                placeholder="Search contacts"
            />
            {isContactSearchLoading ? (
                <ActivityIndicator size="small" color="#8B5CF6" style={{ marginTop: 20 }} />
            ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                    {contactResults.map(function (item, index) {
                        return (
                            <ContactSearchItem
                                key={item.id}
                                item={item}
                                index={index}
                                onAdd={onAdd}
                                onInvite={onInvite}
                            />
                        );
                    })}
                </ScrollView>
            )}
        </>
    );
}
