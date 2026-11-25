import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ArrowUp } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Colors } from '@/lib/constants';

const MIN_TEXT_HEIGHT = 24;
const MAX_TEXT_HEIGHT = 120;
const COMPOSER_HEIGHT = 52;
const TRANSITION_DURATION = 180;

interface SearchComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

/** A compact search composer that expands with focus and multiline text. */
export function SearchComposer({ value, onChangeText, onSubmit, isLoading }: SearchComposerProps) {
  const [focused, setFocused] = useState(false);
  const [contentHeight, setContentHeight] = useState(MIN_TEXT_HEIGHT);
  const reduceMotion = useReducedMotion();
  const expanded = contentHeight > MIN_TEXT_HEIGHT + 8 || value.includes('\n');
  const disabled = !value.trim() || isLoading;
  const inset = useSharedValue(20);
  const height = useSharedValue(COMPOSER_HEIGHT);
  const radius = useSharedValue(COMPOSER_HEIGHT / 2);
  const inputHeight = useSharedValue(MIN_TEXT_HEIGHT);

  useEffect(() => {
    const duration = reduceMotion ? 0 : TRANSITION_DURATION;
    const targetTextHeight = Math.max(MIN_TEXT_HEIGHT, Math.min(contentHeight, MAX_TEXT_HEIGHT));
    inset.value = withTiming(focused ? 0 : 20, { duration });
    height.value = withTiming(expanded ? targetTextHeight + 60 : COMPOSER_HEIGHT, { duration });
    radius.value = withTiming(expanded ? 20 : COMPOSER_HEIGHT / 2, { duration });
    inputHeight.value = withTiming(targetTextHeight, { duration });
  }, [contentHeight, expanded, focused, height, inset, inputHeight, radius, reduceMotion]);

  const animatedContainer = useAnimatedStyle(() => ({
    marginHorizontal: inset.value,
    height: height.value,
    borderRadius: radius.value,
  }));
  const animatedInput = useAnimatedStyle(() => ({ height: inputHeight.value }));

  return (
    <Animated.View style={[styles.composer, animatedContainer]}>
      <Animated.View style={[styles.inputWrap, animatedInput]}>
        <TextInput
          accessibilityLabel="Ask about your memories"
          style={styles.input}
          placeholder="Ask anything about your memories…"
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline
          scrollEnabled={contentHeight >= MAX_TEXT_HEIGHT}
          onContentSizeChange={(event) => {
            const nextHeight = Math.max(MIN_TEXT_HEIGHT, Math.min(event.nativeEvent.contentSize.height, MAX_TEXT_HEIGHT));
            setContentHeight((current) => Math.abs(current - nextHeight) >= 1 ? nextHeight : current);
          }}
        />
      </Animated.View>
      <View style={styles.sendPosition}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Search memories"
          accessibilityState={{ disabled }}
          style={[styles.sendButton, disabled && styles.sendButtonDisabled]}
          onPress={onSubmit}
          disabled={disabled}
        >
          <ArrowUp color="white" size={20} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  composer: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  inputWrap: { marginTop: 13, marginLeft: 16, marginRight: 58 },
  input: {
    flex: 1,
    padding: 0,
    fontSize: 14,
    lineHeight: 20,
    color: '#111827',
    fontFamily: 'Figtree-Regular',
    textAlignVertical: 'top',
  },
  sendPosition: { position: 'absolute', right: 6, bottom: 6 },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  sendButtonDisabled: { backgroundColor: '#CBD5F5' },
});
