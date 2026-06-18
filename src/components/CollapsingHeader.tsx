import React from "react";
import { Text, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from "react-native-reanimated";

import { colors, type, space, GUTTER } from "../theme";

/** Scroll distance over which the big title collapses into the slim bar. */
export const COLLAPSE_DISTANCE = 70;
const SLIM_BAR_HEIGHT = 46;

/**
 * The big in-flow title block. It lives inside the scrollable content (as the
 * list header), so it scrolls away naturally. It also fades + lifts slightly as
 * it approaches the collapse threshold for a smoother handoff to the slim bar.
 */
export function BigTitle({
  title,
  subtitle,
  scrollY,
}: {
  title: string;
  subtitle?: string;
  scrollY: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, COLLAPSE_DISTANCE * 0.85], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(scrollY.value, [0, COLLAPSE_DISTANCE], [0, -8], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.big, style]}>
      <Text style={[type.hero, { color: colors.ink }]}>{title}</Text>
      {!!subtitle && (
        <Text style={[type.caption, { color: colors.inkSoft, marginTop: 2 }]}>{subtitle}</Text>
      )}
    </Animated.View>
  );
}

/**
 * The slim sticky bar, absolutely pinned at the top. Fades in once the big
 * title has mostly scrolled away, so there's always a title on screen.
 */
export function SlimBar({ title, scrollY }: { title: string; scrollY: SharedValue<number> }) {
  const insets = useSafeAreaInsets();

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [COLLAPSE_DISTANCE * 0.6, COLLAPSE_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.slimBar,
        { paddingTop: insets.top, height: insets.top + SLIM_BAR_HEIGHT },
        style,
      ]}
    >
      <View style={styles.slimInner}>
        <Text style={[type.heading, { color: colors.ink }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  big: { paddingHorizontal: GUTTER, paddingTop: space.sm, paddingBottom: space.sm },
  slimBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: colors.paper,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  slimInner: { flex: 1, justifyContent: "center", paddingHorizontal: GUTTER },
});
