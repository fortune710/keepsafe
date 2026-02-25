import { EntryWithProfile } from "@/types/entries";
import { MediaType } from "@/types/media"
import { TZDate } from "@date-fns/tz";
import { getRandomBytesAsync } from 'expo-crypto';

export const getDefaultAvatarUrl = (fullName: string, format: 'png' | 'svg' = 'png') => {
    return `https://api.dicebear.com/9.x/adventurer/${format}?seed=${fullName}`
}

export const getFileExtension = (type: MediaType) => {
    switch (type) {
        case 'photo':
            return 'png';
        case 'video':
            return 'mp4';
        case 'audio':
            return 'm4a';
        default:
            throw new Error(`Invalid media type: ${type}`);
    }
}

export const getContentType = (type: MediaType) => {
    switch (type) {
        case 'photo':
            return 'image/png';
        case 'video':
            return 'video/mp4';
        case 'audio':
            return 'audio/m4a';
    default:
        throw new Error(`Invalid media type: ${type}`);
    }
}

export const isLocalFile = (uri: string) => {
    return uri.startsWith('blob:') || uri.startsWith('file:') || uri.startsWith('content://') || uri.startsWith('file://');
}

export const isBase64File = (uri: string) => {
  return uri.startsWith('data:');
}

const INVITE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const INVITE_CODE_LENGTH = 8;

export async function generateInviteCode(): Promise<string> {
  const charsetSize = INVITE_CHARSET.length;
  const maxMultiple = Math.floor(256 / charsetSize) * charsetSize;
  let result = '';

  while (result.length < INVITE_CODE_LENGTH) {
    const bytes = await getRandomBytesAsync(INVITE_CODE_LENGTH);

    for (let i = 0; i < bytes.length && result.length < INVITE_CODE_LENGTH; i++) {
      const randomByte = bytes[i];
      // Rejection sampling to avoid modulo bias
      if (randomByte >= maxMultiple) continue;

      const index = randomByte % charsetSize;
      result += INVITE_CHARSET[index];
    }
  }

  return result;
}

export const generateDeepLinkUrl = () => {
    const PROD_URL = "https://keepsafe.fortunealebiosu.dev";
    const DEV_URL = "exp://192.168.12.175:8081/--";

    console.log({ env: process.env.EXPO_PUBLIC_NODE_ENV })

    if (process.env.EXPO_PUBLIC_NODE_ENV === "development") {
        return DEV_URL;
    }

    return PROD_URL;
}

export function groupBy<T, K extends keyof T>(
  arr: T[], 
  key: K,
  timezoneUtils?: { getLocalDateString: (timestamp: string | Date) => string; isUTC: (timestamp: string) => boolean }
): Record<string, T[]> {
    if (!arr || !Array.isArray(arr)) {
      return {};
    }
    
    return arr.reduce((acc, item) => {
      if (!item) return acc;
      
      let groupKey: string;
      if ((key === 'updated_at' || key === 'created_at') && typeof item[key] === 'string') {
        const timestamp = item[key] as string;
        
        if (timezoneUtils) {
          // Use timezone utilities to convert UTC timestamps to local timezone
          groupKey = timezoneUtils.getLocalDateString(timestamp);
        } else {
          // Fallback: Group by day (YYYY-MM-DD) in local timezone
          const date = new Date(timestamp);
          if (!isNaN(date.getTime())) {
            // Use local date components to match DateContainer display
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            groupKey = `${year}-${month}-${day}`;
          } else {
            // Invalid date - group under 'invalid-date' or skip
            groupKey = 'invalid-date';
          }
        }
      } else {
        const value = item[key];
        groupKey = value != null ? String(value) : 'null';
      }
      
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(item);
      return acc;
    }, {} as Record<string, T[]>);
}

export const getRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)}d`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        //year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
};

export function dateStringToNumber(dateStr: string): number {
  let hash = 0;

  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }

  // Normalize hash into range [0, 1)
  return (hash >>> 0) / 0xffffffff;
}

/* Calendar utils */
// Generate months from current date backwards
export const generateMonths = () => {
  const months = [];
  const currentDate = new Date();
  
  for (let i = 12; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    months.push(date);
  }
  
  return months;
};

export const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days = [];
  
  // Add empty cells for days before the month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }
  
  return days;
};

export const formatMonthYear = (date: Date) => {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};
  
export const hasEntries = (day: number, monthDate: Date, entriesData: Record<string, number>) => {
  const dateKey = new Date(monthDate.getFullYear(), monthDate.getMonth(), day).toISOString().split('T')[0];
  return entriesData[dateKey] > 0;
};

export const getEntryCount = (day: number, monthDate: Date, entriesData: Record<string, number>) => {
  const dateKey = new Date(monthDate.getFullYear(), monthDate.getMonth(), day).toISOString().split('T')[0];
  return entriesData[dateKey] || 0;
};

export const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* Entry utils */
export const getEntriesForDate = (
  date: string, 
  entries: EntryWithProfile[],
  timezoneUtils?: { getLocalDateString: (timestamp: string | Date) => string; isUTC: (timestamp: string) => boolean }
) => { 
  return entries.filter(entry => {
    let entryDate: string;
    if (timezoneUtils) {
      // Use timezone utilities to convert UTC timestamps to local timezone
      entryDate = timezoneUtils.getLocalDateString(entry.created_at);
    } else {
      // Fallback: Use existing timezone conversion
      entryDate = getTimefromTimezone(new Date(entry.created_at)).toISOString().split('T')[0];
    }
    return entryDate === date;
  }).map(entry => ({
    id: entry.id,
    type: entry.type as 'photo' | 'video' | 'audio',
    content: entry.content_url || '',
    text: entry.text_content || '',
    music: entry.music_tag || undefined,
    location: entry.location_tag || undefined,
    date: new Date(entry.created_at),
    is_private: entry.is_private,
    profile: entry.profile,
    user_id: entry.user_id,
    shared_with: entry.shared_with,
    shared_with_everyone: entry.shared_with_everyone,
    metadata: entry.metadata,
    content_url: entry.content_url,
    text_content: entry.text_content,
    music_tag: entry.music_tag,
    location_tag: entry.location_tag,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
    attachments: entry.attachments
  }));
}

export const getDeviceTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Failed to detect timezone, falling back to UTC:', error);
    return 'UTC';
  }
}

export const getTimefromTimezone = (date?: Date) => {
  const now = date ?? new Date();
  const timezone = getDeviceTimezone();
  return new TZDate(now, timezone);
}

export const extractPhoneNumber = (phoneNumber: string) => {
  return phoneNumber.substring(phoneNumber.length - 10);
}

export const formatPhoneNumber = (phoneNumber: string) => {
  // Remove all non-numeric characters
  const normalized = phoneNumber.replace(/\D/g, '');

  if (!normalized) return '';

  if (normalized.length <= 3) {
    return normalized;
  } else if (normalized.length <= 6) {
    return `(${normalized.substring(0, 3)})-${normalized.substring(3)}`;
  } else {
    return `(${normalized.substring(0, 3)})-${normalized.substring(3, 6)}-${normalized.substring(6, 10)}`;
  }
}


/**
 * Converts a URI/File to ArrayBuffer for upload
 */
export const convertToArrayBuffer = async (source: string): Promise<ArrayBuffer> => {
  const response = await fetch(source);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`);
  }
  
  return await response.arrayBuffer();
};
