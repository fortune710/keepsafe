import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import Animated, { useSharedValue, withRepeat, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { X, Mic, Square, Play } from 'lucide-react-native';

export default function AudioScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  
  const waveAnimation = useSharedValue(0);

  useEffect(() => {
    if (isRecording) {
      waveAnimation.value = withRepeat(
        withTiming(1, { duration: 500 }),
        -1,
        true
      );
    } else {
      waveAnimation.value = withTiming(0);
    }
  }, [isRecording]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setHasRecording(true);
    } else {
      setIsRecording(true);
      setRecordingTime(0);
    }
  };

  const handleNext = () => {
    if (hasRecording) {
      router.push({
        pathname: '/capture/details',
        params: { type: 'audio', duration: recordingTime }
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const animatedWaveStyle = useAnimatedStyle(() => {
    return {
      opacity: waveAnimation.value,
    };
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <X color="#64748B" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Audio Recording</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.waveformContainer}>
          <Animated.View style={[styles.waveform, animatedWaveStyle]}>
            {[...Array(20)].map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.waveBar,
                  { 
                    height: isRecording ? Math.random() * 60 + 20 : 10,
                    backgroundColor: isRecording ? '#8B5CF6' : '#E2E8F0',
                  }
                ]} 
              />
            ))}
          </Animated.View>
        </View>

        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(recordingTime)}</Text>
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Recording</Text>
            </View>
          )}
        </View>

        <View style={styles.controls}>
          <TouchableOpacity 
            style={[styles.recordButton, isRecording && styles.recordingButton]}
            onPress={toggleRecording}
          >
            {isRecording ? (
              <Square color="white" size={24} fill="white" />
            ) : (
              <Mic color="white" size={32} />
            )}
          </TouchableOpacity>
        </View>

        {hasRecording && !isRecording && (
          <View style={styles.playbackControls}>
            <TouchableOpacity style={styles.playButton}>
              <Play color="#8B5CF6" size={24} fill="#8B5CF6" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Add Details</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  waveformContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 80,
  },
  waveBar: {
    width: 4,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  timeContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  timeText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  controls: {
    alignItems: 'center',
    marginBottom: 40,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordingButton: {
    backgroundColor: '#EF4444',
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});