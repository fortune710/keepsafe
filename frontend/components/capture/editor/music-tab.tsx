import { MusicTag } from "@/types/capture";
import { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Text, StyleSheet, View, FlatList } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { MusicListItem } from "../music/music-list-item";
import { Music } from "lucide-react-native";
import { Input } from "@/components/ui/input";
import { scale, verticalScale } from "react-native-size-matters";
import Skeleton, { SkeletonText } from "@/components/ui/skeleton";

interface MusicTabProps {
    isLoading: boolean
    musicQuery: string;
    onMusicQueryChange: (query: string) => void;
    musicTags: MusicTag[];
    onSelectMusic: (music: MusicTag) => void;
}

export default function MusicTab({ isLoading, musicQuery, onMusicQueryChange, musicTags, onSelectMusic }: MusicTabProps) {
    const player = useAudioPlayer(null, { updateInterval: 100 });
    const status = useAudioPlayerStatus(player);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [playRequested, setPlayRequested] = useState(false);
    const playRequestedRef = useRef(false);
    const activePreview = useRef<{ id: number; uri: string } | null>(null);
    const requestId = useRef(0);

    useEffect(() => {
        const subscription = player.addListener('playbackStatusUpdate', (update) => {
            if (update.error || update.didJustFinish) {
                if (update.error) activePreview.current = null;
                playRequestedRef.current = false;
                setPlayRequested(false);
            }
        });
        return () => subscription.remove();
    }, [player]);

    useEffect(() => () => {
        requestId.current += 1;
    }, []);

    const togglePreview = async (music: MusicTag) => {
        if (!music.preview) return;
        const request = ++requestId.current;
        try {
            // A failed source must be replaced before it can be retried.
            if (status.error) activePreview.current = null;
            const current = activePreview.current;
            if (current?.id === music.id && current.uri === music.preview) {
                if (playRequestedRef.current || status.playing) {
                    player.pause();
                    playRequestedRef.current = false;
                    setPlayRequested(false);
                    return;
                }
                if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) {
                    await player.seekTo(0);
                    if (request !== requestId.current) return;
                }
            } else {
                player.pause();
                player.replace({ uri: music.preview });
                activePreview.current = { id: music.id, uri: music.preview };
                setActiveId(music.id);
            }
            player.play();
            playRequestedRef.current = true;
            setPlayRequested(true);
        } catch {
            activePreview.current = null;
            playRequestedRef.current = false;
            setPlayRequested(false);
            Alert.alert('Audio Error', 'Unable to play this preview. Please try again.');
        }
    };

    return (
        <FlatList
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
                <KeyboardAvoidingView behavior="padding">
                    <Input
                        value={musicQuery}
                        onChangeText={onMusicQueryChange}
                        placeholder="Enter music tags..."
                        style={[styles.input]}
                        autoFocus
                        keyboardType="web-search"
                    />
                </KeyboardAvoidingView>
            }
            ListEmptyComponent={<EmptyComponent />}
            data={isLoading ? new Array(10) : musicTags}
            renderItem={({ item }) => {
                if (isLoading) return <LoadingComponent />

                return (
                    <MusicListItem
                        onPress={(music) => {
                            requestId.current += 1;
                            player.pause();
                            playRequestedRef.current = false;
                            setPlayRequested(false);
                            onSelectMusic(music);
                        }}
                        music={item}
                        isPreviewPlaying={activeId === item.id && (playRequested || status.playing)}
                        previewProgress={activeId === item.id && status.duration > 0
                            ? Math.max(0, Math.min(1, status.currentTime / status.duration)) : 0}
                        onTogglePreview={togglePreview}
                    />
                )
            }}
            ListFooterComponent={<View style={styles.listFooter} />}
            ListHeaderComponentStyle={styles.listHeader}
            contentContainerStyle={styles.listContentContainer}
            style={styles.flashListStyle}
        />
    )
}

/**
 * Renders the empty-state view shown when no music results are available.
 *
 * @returns The empty-state React element containing a music icon and the prompt "Start searching for music".
 */
function EmptyComponent() {
    return (
        <View style={styles.emptyContainer}>
            <Music color="#64748B" size={40} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyText}>Start searching for music</Text>
        </View>
    )
}

function LoadingComponent() {
    return (
        <View style={styles.loadingMusicItem}>
            <Skeleton
                width={scale(40)}
                height={verticalScale(35)}
            />

            <SkeletonText lines={2} />
        </View>
    )
}

const styles = StyleSheet.create({
    input: {
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        rowGap: verticalScale(8),
        marginVertical: verticalScale(120),
    },
    emptyText: {
        fontSize: 16,
        fontFamily: "Figtree-Regular",
        color: "#64748B",
    },
    listHeader: { marginBottom: 10 },
    flashListStyle: { paddingVertical: 10, height: verticalScale(570) },
    listContentContainer: { paddingVertical: 10 },
    loadingMusicItem: {
        display: "flex",
        flexDirection: "row",
        gap: 10,
        marginVertical: 7
    },
    listFooter: {
        height: 30,
        paddingVertical: verticalScale(120)
    }
})
