import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from "react-native-reanimated";

import { colors, space, GUTTER, TAB_BAR_SPACE } from "../theme";
import { BigTitle, SlimBar } from "./CollapsingHeader";

/**
 * The ScrollView counterpart of CollapsingList — same collapsing header, for
 * screens whose body is arbitrary content (Intake, Settings) rather than a list.
 */
export function CollapsingScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  return (
    <View style={styles.fill}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xs }]}
      >
        <BigTitle title={title} subtitle={subtitle} scrollY={scrollY} />
        <View style={styles.body}>{children}</View>
      </Animated.ScrollView>

      <SlimBar title={title} scrollY={scrollY} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.paper },
  content: { paddingBottom: TAB_BAR_SPACE },
  body: { paddingHorizontal: GUTTER, gap: space.md, paddingTop: space.xs },
});
