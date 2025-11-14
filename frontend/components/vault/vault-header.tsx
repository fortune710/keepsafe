import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { scale, verticalScale } from "react-native-size-matters";
import Animated, { SlideInDown, SlideOutDown, SlideOutUp } from "react-native-reanimated";

interface VaultHeaderProps {
    isVisible: boolean;
}


export function VaultHeader({ isVisible }: VaultHeaderProps) {
    const router = useRouter();

    if (!isVisible) return null;

    return (
        <Animated.View
            style={styles.headerContainer}
            entering={isVisible ? SlideOutDown.duration(500): undefined}
            //exiting={!isVisible ? SlideOutUp.duration(500) : undefined}
            pointerEvents={isVisible ? "auto" : "none"}
        >
            <View style={styles.header}>
                <Text style={styles.title}>Your Vault</Text>
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => router.replace('/capture')}
                >
                    <X color="#64748B" size={24} />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: "center",
        width: "100%",
        display: 'flex',
        position: 'absolute',
        zIndex: 9999,
        top: verticalScale(30),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#F0F9FF',
        width: '95%',
        borderRadius: scale(16),
        borderWidth: 1
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1E293B',
    },
    closeButton: {
        padding: 8,
    },
})