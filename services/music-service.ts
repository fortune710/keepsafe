import { DeezerMusic, MusicTag } from "@/types/capture";
import axios from "axios";

export class MusicService {
    static async getMusic(query: string): Promise<MusicTag[]> {
        const response = await axios.get("https://api.deezer.com/search/track", {
            params: { q: query }
        })

        const results: DeezerMusic[] = response.data.data;
        const music: MusicTag[] = results.map(item => {
            return  {
                ...item,
                artist: item.artist.name,
                cover: item.album.cover_big
            }
        });

        return music;
    }
}