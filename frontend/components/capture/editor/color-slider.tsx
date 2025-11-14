// ColorSlider.tsx (Cleaned up and corrected for @react-native-community/slider)
import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, TextStyle, ViewStyle, StyleProp } from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient'; 

// Import the custom utility functions
import { hslToHex, hexToHsl, isValidHex } from '@/lib/color-utils'; 

type ColorSliderProps = {
  value?: string;
  onChange?: (color: string) => void;
  style?: ViewStyle | ViewStyle[];
  sliderHeight?: number; // Height of the visual track (LinearGradient)
  thumbSize?: number;    // New prop for clarity on thumb size
};

const ColorSlider: React.FC<ColorSliderProps> = ({
  value,
  onChange,
  style,
  sliderHeight = 12,
  thumbSize = 20, // Define a default thumb size
}) => {
  // ... (initialHue, currentHue, useEffect, gradientColors, handlers remain the same)
  const initialHue = useMemo(() => {
    // ... logic for initial hue
    if (value && isValidHex(value)) {
      const hsl = hexToHsl(value);
      if (hsl) {
        return hsl[0];
      }
    }
    return 0;
  }, [value]);

  const [currentHue, setCurrentHue] = useState(initialHue);
  
  useEffect(() => {
    setCurrentHue(initialHue);
  }, [initialHue]);

  const gradientColors = useMemo(() => {
    return [
      '#ff0000',
      '#ffff00',
      '#00ff00',
      '#00ffff',
      '#0000ff',
      '#ff00ff',
      '#ff0000',
    ];
  }, []);

  const handleValueChange = (newHue: number) => {
    setCurrentHue(newHue);
  };
  
  const handleSlidingComplete = (finalHue: number) => {
    const hexColor = hslToHex(finalHue, 1, 0.5);
    if (onChange) {
      onChange(hexColor);
    }
  };

  const thumbColor = hslToHex(currentHue, 1, 0.5);

  const trackStyle: StyleProp<ViewStyle> = useMemo(() => ({
    height: sliderHeight,
    borderRadius: sliderHeight / 2,
    // The gradient view must be big enough to contain the track
    overflow: 'hidden', 
    position: 'absolute', // Position absolute to layer it under the slider
    width: '100%',
  }), [sliderHeight]);

  // Adjust the wrapper height and position for the visible thumb
  const wrapperStyle: StyleProp<ViewStyle> = useMemo(() => ({
    // The wrapper needs to be tall enough to contain the gradient and the thumb
    height: Math.max(sliderHeight, thumbSize),
    justifyContent: 'center', // Center the track inside the wrapper vertically
  }), [sliderHeight, thumbSize]);

  return (
    <View style={[styles.container, style]}>
      {/* Wrapper to hold the gradient and the slider */}
      <View style={wrapperStyle}>
        {/* LinearGradient forms the colorful track background */}
        <LinearGradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          colors={gradientColors as any}
          // IMPORTANT: Set height to the track height and align it centrally
          style={[trackStyle, { alignSelf: 'center', marginHorizontal: 10 }]} 
        />
        
        {/* The Slider component is layered on top. 
            Its height must allow the thumb to be fully visible. */}
        <Slider
          style={[styles.slider, { height: Math.max(sliderHeight, thumbSize * 1.5) }]}
          minimumValue={0}
          maximumValue={359.99} 
          step={1}
          value={currentHue}
          onValueChange={handleValueChange}
          onSlidingComplete={handleSlidingComplete}
          
          minimumTrackTintColor="transparent"
          maximumTrackTintColor="transparent"
          
          thumbTintColor={thumbColor}
          // The thumb's size and shape are often platform-specific 
          // and controlled by the overall 'style' height on Android.
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    //paddingHorizontal: 10,
    width: '100%',
  },
  slider: {
    width: '100%',
    // Height is adjusted in the component to accommodate the thumb
  },
  // We keep this thumb style for reference, but it's not directly applied via a prop.
  thumb: {
    // This styling is mostly ignored by the standard Slider, 
    // but the color is applied via thumbTintColor
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#fff', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 3,
  },
});

export default ColorSlider;