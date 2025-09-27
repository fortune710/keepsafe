import { MediaType } from "@/types/media"

export const getDefaultAvatarUrl = (fullName: string) => {
    return `https://api.dicebear.com/9.x/adventurer-neutral/png?seed=${fullName}`
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

export function generateInviteCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
}

export const generateDeepLinkUrl = () => {
    const PROD_URL = "https://keepsafe.app";
    const DEV_URL = "exp://192.168.12.175:8081/--";

    console.log({ env: process.env.EXPO_PUBLIC_NODE_ENV })

    if (process.env.EXPO_PUBLIC_NODE_ENV === "development") {
        return DEV_URL;
    }

    return PROD_URL;
}

export function groupBy<T, K extends keyof T>(arr: T[], key: K): Record<string, T[]> {
    return arr.reduce((acc, item) => {
      let groupKey: string;
      if ((key === 'updated_at' || key === 'created_at') && typeof item[key] === 'string') {
        // Group by day (YYYY-MM-DD) if key is 'updated_at'
        const date = new Date(item[key] as string);
        groupKey = date.toISOString().slice(0, 10);
      } else {
        groupKey = String(item[key]);
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
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
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
  
  