import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { Camera, Brain, Users } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const valueProps = [
  {
    icon: Camera,
    title: 'Capture',
    description: 'Capture a photo, a thought, or an emotion.',
  },
  {
    icon: Brain,
    title: 'Reflect',
    description: 'Find meaning with AI-powered insights.',
  },
  {
    icon: Users,
    title: 'Share',
    description: 'Share with the people who matter most.',
  },
];

export default function ValuePropsScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < valueProps.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      router.push('/onboarding/auth');
    }
  };

  const handleSkip = () => {
    router.push('/onboarding/auth');
  };

  const currentProp = valueProps[currentIndex];
  const IconComponent = currentProp.icon;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <Animated.View 
        key={currentIndex}
        entering={FadeInRight}
        exiting={FadeOutLeft}
        style={styles.content}
      >
        <View style={styles.iconContainer}>
          <IconComponent size={80} color="#8B5CF6" strokeWidth={1.5} />
        </View>
        
        <Text style={styles.title}>{currentProp.title}</Text>
        <Text style={styles.description}>{currentProp.description}</Text>
      </Animated.View>

      <View style={styles.bottomContainer}>
        <View style={styles.indicators}>
          {valueProps.map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.indicator,
                index === currentIndex && styles.activeIndicator
              ]} 
            />
          ))}
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {currentIndex === valueProps.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
  },
  skipButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  skipText: {
    color: '#64748B',
    fontSize: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 18,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: width * 0.8,
  },
  bottomContainer: {
    alignItems: 'center',
  },
  indicators: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#8B5CF6',
    width: 24,
  },
  nextButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 25,
    width: width * 0.7,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});