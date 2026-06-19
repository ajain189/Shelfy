import React from "react";
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from "react-native-reanimated";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { colors, type, motion, shadow, radius, space } from "../theme";

const ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  Intake: "camera",
  Inventory: "layers",
  Shelf: "grid",
  Settings: "sliders",
};

const BAR_HEIGHT = 64;
const H_MARGIN = 16;
const BAR_PADDING = 6;

/**
 * A floating, glass (blurred) tab bar — a rounded "cylinder" that hovers above
 * the content. An active-pill indicator springs horizontally between tabs
 * (production spring, no bounce); reduced-motion users get an instant move.
 *
 * Motion rationale: tab switching is occasional (not 100s/day) and benefits
 * from continuity — the sliding pill ties the previous and next states
 * together so the change reads as one object moving, not two flashes.
 */
export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();

  const tabCount = state.routes.length;
  const innerWidth = width - H_MARGIN * 2 - BAR_PADDING * 2;
  const pillWidth = innerWidth / tabCount;

  const indicatorX = useSharedValue(state.index * pillWidth);

  React.useEffect(() => {
    const target = state.index * pillWidth;
    indicatorX.value = reduced ? target : withSpring(target, motion.spring);
  }, [state.index, pillWidth, reduced, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: pillWidth,
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: insets.bottom > 0 ? insets.bottom : space.md }]}
    >
      <View style={[styles.bar, shadow.float]}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.tint} />

        <View style={styles.inner}>
          {/* The sliding active pill sits behind the labels */}
          <Animated.View style={[styles.indicatorWrap, indicatorStyle]}>
            <View style={styles.indicator} />
          </Animated.View>

          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const label = (options.title ?? route.name) as string;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={styles.tab}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={label}
              >
                <Feather
                  name={ICONS[route.name] ?? "circle"}
                  size={20}
                  color={focused ? "#FFFFFF" : "#A7AEB8"}
                />
                <Text
                  style={[
                    type.label,
                    styles.tabLabel,
                    { color: focused ? "#FFFFFF" : "#A7AEB8" },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: H_MARGIN,
    alignItems: "stretch",
  },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: radius.pill,
    overflow: "hidden",
    backgroundColor: "rgba(28,29,25,0.55)", // fallback tint under the blur
  },
  // Warm dark tint layered over the blur so the glass reads as one object.
  tint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(32,33,29,0.62)",
  },
  inner: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: BAR_PADDING,
    alignItems: "center",
  },
  indicatorWrap: {
    position: "absolute",
    left: BAR_PADDING,
    top: BAR_PADDING,
    bottom: BAR_PADDING,
    paddingHorizontal: 4,
  },
  indicator: {
    flex: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.clay,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    height: "100%",
  },
  tabLabel: { fontSize: 11 },
});
