import React, { useState, useEffect, useRef } from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';

export interface TypewriterProps {
  /** Array of texts to type out in sequence */
  texts: string[];
  /** Whether to loop through texts continuously */
  loop?: boolean;
  /** Delay in milliseconds between each character */
  delay?: number;
  /** Delay in milliseconds before starting to type the next text */
  pauseDelay?: number;
  /** Optional className for web compatibility */
  className?: string;
  /** Optional style for the text */
  style?: TextStyle;
  /** Callback fired when all texts have been typed (if loop is false) */
  onComplete?: () => void;
}

export default function Typewriter({
  texts,
  loop = false,
  delay = 50,
  pauseDelay = 2000,
  className,
  style,
  onComplete,
}: TypewriterProps) {
  const [displayText, setDisplayText] = useState('');
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  const timeoutRef = useRef<number | null>(null);
  const cursorIntervalRef = useRef<number | null>(null);

  // Blinking cursor effect
  useEffect(() => {
    cursorIntervalRef.current = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);

    return () => {
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (texts.length === 0) return;

    const currentText = texts[currentTextIndex];
    if (!currentText) return;

    // If we're paused (after completing a text), wait before starting next
    if (isPaused) {
      timeoutRef.current = setTimeout(() => {
        setIsPaused(false);
        if (isDeleting) {
          // Move to next text after deletion
          const isLastText = currentTextIndex === texts.length - 1;
          if (loop || !isLastText) {
            setCurrentTextIndex((prev) => (prev + 1) % texts.length);
            setCurrentCharIndex(0);
            setIsDeleting(false);
          } else {
            // All texts completed, no loop - keep last text displayed
            onComplete?.();
          }
        } else {
          // Start deleting current text (only if loop is enabled or not last text)
          const isLastText = currentTextIndex === texts.length - 1;
          if (loop || !isLastText) {
            setIsDeleting(true);
          } else {
            // Last text, no loop - keep it displayed
            onComplete?.();
          }
        }
      }, pauseDelay);
      return;
    }

    // Typing logic
    if (!isDeleting) {
      // Typing forward
      if (currentCharIndex < currentText.length) {
        timeoutRef.current = setTimeout(() => {
          setDisplayText(currentText.substring(0, currentCharIndex + 1));
          setCurrentCharIndex((prev) => prev + 1);
        }, delay);
      } else {
        // Finished typing, pause before deleting
        setIsPaused(true);
      }
    } else {
      // Deleting backward
      if (currentCharIndex > 0) {
        timeoutRef.current = setTimeout(() => {
          setDisplayText(currentText.substring(0, currentCharIndex - 1));
          setCurrentCharIndex((prev) => prev - 1);
        }, delay);
      } else {
        // Finished deleting, pause before next text
        setIsPaused(true);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    texts,
    currentTextIndex,
    currentCharIndex,
    isDeleting,
    isPaused,
    delay,
    pauseDelay,
    loop,
    onComplete,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
      }
    };
  }, []);

  return (
    <Text className={className} style={[styles.text, style]}>
      {displayText}
      {showCursor && <Text style={styles.cursor}>|</Text>}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    includeFontPadding: false,
  },
  cursor: {
    opacity: 1,
  },
});

