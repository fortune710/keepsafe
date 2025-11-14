import { SuggestedFriend } from "@/types/friends";
import { View, StyleSheet, Text } from "react-native";
import SuggestedFriendItem from "./suggested-friend-item";
import { Contact, Sparkle } from "lucide-react-native";
import { Colors } from "@/lib/constants";
import { useAuthContext } from "@/providers/auth-provider";

interface SuggestedFriendsListProps {
    friends: SuggestedFriend[];
}

export default function SuggestedFriendsList({ friends }: SuggestedFriendsListProps) {
    const { profile } = useAuthContext();
    const filteredFriends = friends.filter(friend => friend.id !== profile?.id);
    
    if (filteredFriends.length === 0) return null;
    return (
        <View>
            <View style={styles.sectionHeader}>
                <Contact color={Colors.black} size={16} />
                <Text style={styles.sectionTitle}>
                    Your Contacts
                </Text>
            </View>
            {
                friends.map((friend) => (
                    <SuggestedFriendItem key={friend.id} friend={friend}/>
                ))
            }
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      marginTop: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748B',
        marginLeft: 8,
      },
})