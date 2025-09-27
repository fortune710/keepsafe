type MediaCanvasItemType = "text" | "sticker" | "music";

export interface MediaCanvasItem {
    id: number;
    type: MediaCanvasItemType;
    text?: string;
    sticker?: any;
    music_tag?: MusicTag;
}

export interface RenderedMediaCanvasItem extends MediaCanvasItem {
    transforms: Transforms
}

export interface Transforms {
    x: number;
    y: number;
    scale: number;
    rotation: number;
}

export interface DeezerMusic {
    id: number;
    title: string;
    duration: number;
    preview: string;
    artist: {
        id: number;
        name: string;
    };
    album: {
        id: number;
        cover_medium: string;
        cover_small: string;
        cover_big: string;
    }
}

export interface MusicTag {
    id: number;
    title: string;
    duration: number;
    preview: string;
    artist: string;
    cover: string;
}