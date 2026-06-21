import React from "react";
import { Pressable, PressableProps, ViewStyle, StyleProp } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from "react-native-reanimated";

import { motion } from "../theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * A Pressable that springs down to a slightly smaller scale while held, the
 * tactile press feedback recipe (Emil). Production spring, no bounce. Honors
 * reduced-motion by skipping the scale entirely.
 */
export function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  disabled,
  ...rest
}: PressableProps & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
}) {
  const pressed = useSharedValue(0);
  const reduced = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: reduced
          ? 1
          : withSpring(pressed.value ? scaleTo : 1, motion.springSnappy),
      },
    ],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => (pressed.value = 1)}
      onPressOut={() => (pressed.value = 0)}
      disabled={disabled}
      style={[style, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
