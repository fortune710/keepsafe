import React from 'react';
import PageHeader from '@/components/page-header';
import { Colors } from '@/lib/constants';

interface FriendsHeaderProps {
  title: string;
}

export function FriendsHeader({ title }: FriendsHeaderProps) {
  return (
    <PageHeader
      title={title}
      hideBackButton
      backgroundColor={Colors.background}
    />
  );
}
