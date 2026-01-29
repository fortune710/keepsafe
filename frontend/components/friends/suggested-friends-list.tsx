import { SuggestedFriend } from "@/types/friends";
import { View, StyleSheet, Text } from "react-native";
import SuggestedFriendItem from "./suggested-friend-item";
import { Contact, Sparkle } from "lucide-react-native";
import { Colors } from "@/lib/constants";
import { useAuthContext } from "@/providers/auth-provider";
import { moderateScale, verticalScale } from "react-native-size-matters";

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
                friends.map((friend, index) => (
                    <SuggestedFriendItem 
                        key={friend.id} 
                        friend={friend} 
                        index={index}
                    />
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
      marginBottom: verticalScale(10),
      marginTop: verticalScale(20),
    },
    sectionTitle: {
        fontSize: moderateScale(14),
        fontWeight: '600',
        fontFamily: 'Outfit-SemiBold',
        color: '#64748B',
        marginLeft: 8,
      },
})