import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import Animated, { SlideInLeft, SlideOutLeft } from 'react-native-reanimated';
import { Archive, Calendar, Users, UserPlus, Sparkles, Settings, X } from 'lucide-react-native';

interface DrawerMenuProps {
  isVisible: boolean;
  onClose: () => void;
}

const menuItems = [
  { name: 'Vault', route: '/vault', icon: Archive },
  { name: 'Calendar', route: '/calendar', icon: Calendar },
  { name: 'Social', route: '/social', icon: Users },
  { name: 'Friends', route: '/friends', icon: UserPlus },
  { name: 'Dreamscape', route: '/dreamscape', icon: Sparkles },
  { name: 'Settings', route: '/settings', icon: Settings },
];

export default function DrawerMenu({ isVisible, onClose }: DrawerMenuProps) {
  if (!isVisible) return null;

  const handleNavigation = (route: string) => {
    onClose();
    router.push(route as any);
  };

  return (
    <Animated.View 
      entering={SlideInLeft} 
      exiting={SlideOutLeft}
      style={styles.overlay}
    >
      <TouchableOpacity style={styles.backdrop} onPress={onClose} />
      <Animated.View style={styles.drawer}>
        <SafeAreaView style={styles.drawerContent}>
          <View style={styles.header}>
            <Text style={styles.appName}>Keepsafe</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X color="#64748B" size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.menuContainer}>
            {menuItems.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <TouchableOpacity
                  key={item.name}
                  style={styles.menuItem}
                  onPress={() => handleNavigation(item.route)}
                >
                  <IconComponent color="#64748B" size={24} />
                  <Text style={styles.menuText}>{item.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SafeAreaView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  drawerContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  menuContainer: {
    flex: 1,
    paddingTop: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  menuText: {
    fontSize: 18,
    color: '#1E293B',
    marginLeft: 16,
    fontWeight: '500',
  },
});