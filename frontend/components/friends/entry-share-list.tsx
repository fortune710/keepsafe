import { View, ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { scale, verticalScale } from "react-native-size-matters";
import { Lock, Users } from "lucide-react-native";
import { Image } from "expo-image";

interface EntryShareListProps {
    isPrivate: boolean;
    isEveryone: boolean;
    selectedFriends: string[];
    handlePrivateToggle: () => void;
    handleEveryoneToggle: () => void;
    handleFriendToggle: (friendId: string) => void;
    friends: Friend[];
}

interface Friend {
    id: string;
    name: string;
    avatar: string;
    username: string;
}


export default function EntryShareList({ isPrivate, isEveryone, selectedFriends, handlePrivateToggle, handleEveryoneToggle, handleFriendToggle, friends }: EntryShareListProps) {
    return (
        <View>
            <Text style={styles.privacyText}>
                Share With
            </Text>

            <View style={styles.privacySection}>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.friendsScroll}
                contentContainerStyle={styles.friendsScrollContent}
              >
                <TouchableOpacity 
                  style={[styles.friendOption, isPrivate && styles.selectedFriendOption]}
                  onPress={handlePrivateToggle}
                >
                  <View style={[styles.friendAvatar, styles.privateAvatar, isPrivate && styles.selectedPrivateAvatar]}>
                    <Lock color={isPrivate ? 'white' : '#64748B'} size={16} />
                  </View>
                  <Text style={[styles.friendName, isPrivate && styles.selectedFriendName]}>Private</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.friendOption, isEveryone && styles.selectedFriendOption]}
                  onPress={handleEveryoneToggle}
                >
                  <View style={[styles.friendAvatar, styles.everyoneAvatar, isEveryone && styles.selectedEveryoneAvatar]}>
                    <Users color={isEveryone ? 'white' : '#64748B'} size={16} />
                  </View>
                  <Text style={[styles.friendName, isEveryone && styles.selectedFriendName]}>Everyone</Text>
                </TouchableOpacity>

                {friends.map((friend) => (
                  <TouchableOpacity 
                    key={friend.id}
                    style={[
                      styles.friendOption, 
                      selectedFriends.includes(friend.id) && !isPrivate && !isEveryone && styles.selectedFriendOption,
                      (isPrivate || isEveryone) && styles.disabledFriendOption
                    ]}
                    onPress={() => handleFriendToggle(friend.id)}
                    //disabled={isPrivate || isEveryone}
                  >
                    <Image 
                      source={{ uri: friend.avatar }} 
                      style={[
                        styles.friendAvatar,
                        selectedFriends.includes(friend.id) && !isPrivate && !isEveryone && styles.selectedFriendAvatar,
                        (isPrivate || isEveryone) && styles.disabledFriendAvatar
                      ]} 
                    />
                    <Text style={[
                      styles.friendName,
                      selectedFriends.includes(friend.id) && !isPrivate && !isEveryone && styles.selectedFriendName,
                      (isPrivate || isEveryone) && styles.disabledFriendName
                    ]}>
                      {friend.username}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

        </View>
    )
}

const styles = StyleSheet.create({
    privacyText: {
        textAlign: "center",
        fontSize: scale(16),
        fontWeight: '500',
        marginVertical: verticalScale(8)
    },
    privacySection: {
        marginBottom: 32,
    },
    friendsScroll: {
        marginBottom: 8,
    },
    friendsScrollContent: {
        paddingRight: 20,
    },
    friendOption: {
        alignItems: 'center',
        marginRight: 16,
        padding: 8,
        borderRadius: 16,
    },
    selectedFriendOption: {
        backgroundColor: '#EEF2FF',
    },
    disabledFriendOption: {
        opacity: 0.5,
    },
    friendAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginBottom: 8,
    },
    privateAvatar: {
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedFriendAvatar: {
        borderWidth: 3,
        borderColor: '#8B5CF6',
    },
    selectedPrivateAvatar: {
        backgroundColor: '#8B5CF6',
    },
    everyoneAvatar: {
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedEveryoneAvatar: {
        backgroundColor: '#059669',
    },
    disabledFriendAvatar: {
        opacity: 0.5,
    },
    friendName: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
        textAlign: 'center',
    },
    selectedFriendName: {
        color: '#8B5CF6',
        fontWeight: '600',
    },
    disabledFriendName: {
        opacity: 0.5,
    },
})