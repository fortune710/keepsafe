import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { HardDrive, Image, Mic, Trash2, Download } from 'lucide-react-native';
import { BackButton } from '@/components/back-button';
import { Colors } from '@/lib/constants';

// Every option icon shares this neutral slate color, matching the main
// settings screen.
const OPTION_ICON_COLOR = '#64748B';

interface StorageData {
  type: string;
  icon: any;
  size: string;
  count: number;
}

const storageData: StorageData[] = [
  {
    type: 'Photos',
    icon: Image,
    size: '2.4 GB',
    count: 1247,
  },
  {
    type: 'Audio',
    icon: Mic,
    size: '156 MB',
    count: 89,
  },
];

export default function StorageScreen() {
  const [totalUsed] = useState('2.6 GB');
  const [totalAvailable] = useState('5.0 GB');

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear temporary files and may free up some space.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', onPress: () => Alert.alert('Success', 'Cache cleared successfully') }
      ]
    );
  };

  const handleOptimizeStorage = () => {
    Alert.alert(
      'Optimize Storage',
      'This will compress older media files to save space.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Optimize', onPress: () => Alert.alert('Success', 'Storage optimized successfully') }
      ]
    );
  };

  const usagePercentage = (parseFloat(totalUsed) / parseFloat(totalAvailable)) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.title}>Storage & Data</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.usageSection}>
          <Text style={styles.sectionTitle}>Storage Usage</Text>
          
          <View style={styles.usageCard}>
            <View style={styles.usageHeader}>
              <HardDrive color="#8B5CF6" size={24} />
              <Text style={styles.usageText}>{totalUsed} of {totalAvailable} used</Text>
            </View>
            
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${usagePercentage}%`,
                    backgroundColor: usagePercentage > 80 ? '#EF4444' : '#8B5CF6'
                  }
                ]} 
              />
            </View>
          </View>
        </View>

        <View style={styles.breakdownSection}>
          <Text style={styles.sectionTitle}>Storage Breakdown</Text>
          
          <View>
            {storageData.map((item) => {
              const IconComponent = item.icon;
              return (
                <View key={item.type} style={styles.breakdownItem}>
                  <View style={styles.iconContainer}>
                    <IconComponent color={OPTION_ICON_COLOR} size={20} />
                  </View>
                  
                  <View style={styles.breakdownContent}>
                    <Text style={styles.breakdownTitle}>{item.type}</Text>
                    <Text style={styles.breakdownCount}>{item.count} items</Text>
                  </View>
                  
                  <Text style={styles.breakdownSize}>{item.size}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Storage Actions</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleOptimizeStorage}>
            <View style={styles.iconContainer}>
              <Download color={OPTION_ICON_COLOR} size={20} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Optimize Storage</Text>
              <Text style={styles.actionDescription}>Compress older media to save space</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleClearCache}>
            <View style={styles.iconContainer}>
              <Trash2 color={OPTION_ICON_COLOR} size={20} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Clear Cache</Text>
              <Text style={styles.actionDescription}>Remove temporary files and data</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Outfit-SemiBold',
    color: '#1E293B',
  },
  content: {
    flex: 1,
  },
  usageSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-SemiBold',
    color: '#1E293B',
    marginBottom: 16,
  },
  usageCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  usageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  usageText: {
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
    color: '#1E293B',
    marginLeft: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  breakdownSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${OPTION_ICON_COLOR}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  breakdownContent: {
    flex: 1,
  },
  breakdownTitle: {
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
    color: '#1E293B',
    marginBottom: 2,
  },
  breakdownCount: {
    fontSize: 14,
    fontFamily: 'Jost-Regular',
    color: '#64748B',
  },
  breakdownSize: {
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
    color: '#1E293B',
  },
  actionsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 2,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
    color: '#1E293B',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
    fontFamily: 'Jost-Regular',
    color: '#64748B',
  },
});