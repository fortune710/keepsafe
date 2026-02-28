import { View, ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { scale, verticalScale } from "react-native-size-matters";
import { TextIcon, MusicIcon, MapPin } from "lucide-react-native";
import { MediaCanvasItemType } from "@/types/capture";

interface EntryAttachmentListProps {
    onSelectAttachment: (type: MediaCanvasItemType) => void;
}

const attachmentTypes: { type: MediaCanvasItemType; icon: React.ComponentType<any>; label: string }[] = [
    { type: "text", icon: TextIcon, label: "Text" },
    { type: "music", icon: MusicIcon, label: "Music" },
    { type: "location", icon: MapPin, label: "Location" },
];

/**
 * Renders a labeled horizontal list of attachment options and invokes a callback when an option is selected.
 *
 * Each option displays an icon inside a circular avatar with a label underneath; tapping an option calls
 * `onSelectAttachment` with that option's `MediaCanvasItemType`.
 *
 * @param onSelectAttachment - Callback invoked with the selected attachment `type` when an option is pressed
 * @returns A React element that renders the attachment selector UI
 */
export default function EntryAttachmentList({ onSelectAttachment }: EntryAttachmentListProps) {
    return (
        <View>
            <Text style={styles.attachmentText}>
                Add Attachment
            </Text>

            <View style={styles.attachmentSection}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.attachmentsScroll}
                    contentContainerStyle={styles.attachmentsScrollContent}
                >
                    {attachmentTypes.map((attachment) => {
                        const IconComponent = attachment.icon;
                        return (
                            <TouchableOpacity
                                key={attachment.type}
                                style={styles.attachmentOption}
                                onPress={() => onSelectAttachment(attachment.type)}
                            >
                                <View style={styles.attachmentAvatar}>
                                    <IconComponent color="#64748B" size={20} />
                                </View>
                                <Text style={styles.attachmentName}>{attachment.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    attachmentText: {
        textAlign: "center",
        fontSize: scale(16),
        fontFamily: 'Outfit-SemiBold',
        fontWeight: '500',
        marginVertical: verticalScale(8)
    },
    attachmentSection: {
        marginBottom: 32,
    },
    attachmentsScroll: {
        marginBottom: 8,
    },
    attachmentsScrollContent: {
        paddingRight: 20,
    },
    attachmentOption: {
        alignItems: 'center',
        marginRight: 16,
        padding: 8,
        borderRadius: 16,
    },
    attachmentAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginBottom: 8,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    attachmentName: {
        fontSize: 12,
        fontFamily: 'Jost-SemiBold',
        color: '#64748B',
        fontWeight: '500',
        textAlign: 'center',
    },
});
