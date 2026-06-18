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
 * A FlatList with an iOS-style collapsing header baked in. The big title lives
 * in the list header (so it scrolls away with the content); a slim sticky bar
 * fades in on top once it's gone. Scroll position is tracked on the UI thread
 * via reanimated, so it stays smooth.
 *
 * `controls` (search field, filter chips) render directly under the big title
 * and scroll away with it.
 */
export function CollapsingList<T>({
  title,
  subtitle,
  data,
  keyExtractor,
  renderItem,
  controls,
  ListEmptyComponent,
}: {
  title: string;
  subtitle?: string;
  data: readonly T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => React.ReactElement | null;
  controls?: React.ReactNode;
  ListEmptyComponent?: React.ReactElement;
}) {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  return (
    <View style={styles.fill}>
      <Animated.FlatList
        data={data as T[]}
        keyExtractor={keyExtractor}
        renderItem={({ item, index }) => renderItem(item, index)}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xs }]}
        ListHeaderComponent={
          <View>
            <BigTitle title={title} subtitle={subtitle} scrollY={scrollY} />
            {!!controls && <View style={styles.controls}>{controls}</View>}
          </View>
        }
        ListEmptyComponent={ListEmptyComponent}
      />

      <SlimBar title={title} scrollY={scrollY} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: GUTTER, paddingBottom: TAB_BAR_SPACE, gap: space.sm + 2 },
  controls: { gap: space.sm, paddingTop: space.xs, paddingBottom: space.sm },
});
