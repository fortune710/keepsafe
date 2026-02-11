import { MusicTag } from "@/types/capture";
import { KeyboardAvoidingView, Text, TextInput, StyleSheet, View, FlatList, ActivityIndicator } from "react-native";
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
                        keyboardType="web-search"
                    />
                </KeyboardAvoidingView>
            }
            ListEmptyComponent={<EmptyComponent/>}
            data={isLoading ? new Array(10) : musicTags}
            renderItem={({ item }) => {
                if (isLoading) return <LoadingComponent/>
                
                return (
                    <MusicListItem 
                        onPress={(music) => onSelectMusic(music)}
                        music={item} 
                    />
                )
            }}
            ListFooterComponent={<View style={styles.listFooter}/>}
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

            <SkeletonText lines={2}/>
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
        color: "#64748B",
    },
    listHeader: { marginBottom: 10 },
    flashListStyle: { paddingVertical: 10, height: 950 },
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