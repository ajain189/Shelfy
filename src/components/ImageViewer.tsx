import React from "react";
import {
  Modal,
  View,
  Image,
  Pressable,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { type } from "../theme";

/**
 * Full-screen photo viewer, opened by tapping a photo in the detail sheet.
 * View-only (the user asked to see the uploaded picture), on a dark backdrop so
 * the label fills the screen. Multiple photos scroll horizontally, paged.
 */
export function ImageViewer({
  uris,
  startIndex = 0,
  visible,
  onClose,
}: {
  uris: string[];
  startIndex?: number;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: startIndex * width, y: 0 }}
        >
          {uris.map((uri, i) => (
            <View key={`${uri}-${i}`} style={[styles.page, { width }]}>
              <Image source={{ uri }} style={styles.image} resizeMode="contain" />
            </View>
          ))}
        </ScrollView>

        {uris.length > 1 && (
          <View style={[styles.counter, { top: insets.top + 14 }]}>
            <Text style={[type.label, styles.counterText]}>{uris.length} photos</Text>
          </View>
        )}

        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={[styles.close, { top: insets.top + 8 }]}
        >
          <Feather name="x" size={26} color="#FFFFFF" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15, 14, 12, 0.97)" },
  page: { flex: 1, alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  close: { position: "absolute", right: 18, width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  counter: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  counterText: { color: "#FFFFFF" },
});
