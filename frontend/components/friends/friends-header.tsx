import React from 'react';
import PageHeader from '@/components/page-header';

interface FriendsHeaderProps {
  title: string;
}

export function FriendsHeader({ title }: FriendsHeaderProps) {
  return <PageHeader title={title} backButtonPlacement="right" />;
}
