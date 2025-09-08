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