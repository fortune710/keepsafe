export type MediaType = 'photo' | 'video' | 'audio';

export interface MediaCapture {
  id: string;
  type: MediaType;
  uri: string;
  duration?: number; // For audio/video in seconds
  timestamp: Date;
  metadata?: {
    width?: number;
    height?: number;
    size?: number;
  };
}

export interface MediaEntry {
  id: string;
  capture: MediaCapture;
  content: {
    text: string;
    wordCount: number;
  };
  tags: {
    music?: string;
    location?: string;
  };
  sharing: {
    isPrivate: boolean;
    isEveryone: boolean;
    selectedFriends: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Friend {
  id: string;
  name: string;
  email: string;
  avatar: string;
  status: 'connected' | 'pending';
}

export interface ShareResult {
  success: boolean;
  message: string;
  entryId?: string;
}