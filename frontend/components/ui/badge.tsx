import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  TextStyle,
  GestureResponderEvent,
} from "react-native";

type Variant = "solid" | "outline" | "subtle";
type SizeKey = "sm" | "md" | "lg";

export interface BadgeProps {
  /** Text shown inside the badge (ignored if children provided) */
  text?: string | number;
  /** Optional children (e.g. icon + text) */
  children?: React.ReactNode;
  /** ISO country code mapping not needed here, just for earlier context */
  variant?: Variant;
  size?: SizeKey | number; // 'sm'|'md'|'lg' or numeric height
  color?: string; // text / icon color
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  maxCount?: number; // if text is numeric and exceeds maxCount, show `+maxCount`
  onPress?: (e: GestureResponderEvent) => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessible?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

/** Default size map (height, horizontal padding, fontSize) */
const SIZE_MAP: Record<SizeKey, { height: number; paddingH: number; fontSize: number }> = {
  sm: { height: 18, paddingH: 6, fontSize: 11 },
  md: { height: 24, paddingH: 8, fontSize: 13 },
  lg: { height: 32, paddingH: 10, fontSize: 15 },
};

export default function Badge({
  text,
  children,
  variant = "solid",
  size = "md",
  color,
  backgroundColor,
  borderColor,
  borderWidth,
  borderRadius,
  maxCount,
  onPress,
  style,
  textStyle,
  accessible = true,
  accessibilityLabel,
  testID,
}: BadgeProps) {
  // resolve numeric or mapped size
  let height: number;
  let paddingH: number;
  let fontSize: number;
  if (typeof size === "number") {
    height = size;
    paddingH = Math.max(6, Math.round(size * 0.3));
    fontSize = Math.max(10, Math.round(size * 0.45));
  } else {
    const s = SIZE_MAP[size];
    height = s.height;
    paddingH = s.paddingH;
    fontSize = s.fontSize;
  }

  // sensible defaults
  const defaultBg =
    variant === "solid" ? "#ef4444" : variant === "subtle" ? "rgba(239,68,68,0.12)" : "transparent";
  const defaultText = variant === "subtle" ? "#ef4444" : variant === "solid" ? "#fff" : "#111";

  const resolvedBg = backgroundColor ?? defaultBg;
  const resolvedText = color ?? defaultText;
  const resolvedBorderColor = borderColor ?? (variant === "outline" ? "#ddd" : "transparent");
  const resolvedBorderWidth = borderWidth ?? (variant === "outline" ? 1 : 0);
  const resolvedRadius = borderRadius ?? Math.round(height / 2);

  // numeric max count handling
  let displayText: React.ReactNode = text;
  if (typeof text === "number" && typeof maxCount === "number") {
    displayText = text > maxCount ? `+${maxCount}` : `${text}`;
  }

  const Container: any = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      style={[
        styles.container,
        {
          height,
          paddingHorizontal: paddingH,
          backgroundColor: resolvedBg,
          borderColor: resolvedBorderColor,
          borderWidth: resolvedBorderWidth,
          borderRadius: resolvedRadius,
          //alignSelf: "flex-center",
        },
        style,
      ]}
      accessible={accessible}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {children ? (
        // let the caller manage spacing inside children
        <View style={{ flexDirection: "row", alignItems: "center" }}>{children}</View>
      ) : (
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[
            styles.text,
            { color: resolvedText, fontSize },
            textStyle,
          ]}
        >
          {displayText}
        </Text>
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    fontWeight: "600",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});
