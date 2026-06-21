import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { colors, space, type, radius, shadow, fonts, GUTTER, TAB_BAR_SPACE } from "../theme";
import { PressableScale } from "../components/PressableScale";

/**
 * The front door. One job: send the person down the right path. A volunteer
 * sorting donations, or a family member looking for food they can take home.
 * Two big buttons, nothing else to read or decide.
 */
export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  return (
    <View style={[styles.fill, { paddingTop: insets.top }]}>
      <View style={styles.head}>
        <Text style={[type.overline, { color: colors.clay }]}>SHELFSIGHT</Text>
        <Text style={styles.title}>What would you like to do?</Text>
      </View>

      <View style={styles.paths}>
        <PathButton
          icon="camera"
          title="Sort donations"
          body="Photograph a label and Shelfy reads it for you."
          onPress={() => navigation.navigate("Scan")}
          primary
        />
        <PathButton
          icon="shopping-bag"
          title="Browse Shelf"
          body="Check what is available in your pantry"
          onPress={() => navigation.navigate("Shelf")}
        />
      </View>
    </View>
  );
}

/** One of the two big path buttons, the only decision on the screen. */
function PathButton({
  icon,
  title,
  body,
  onPress,
  primary = false,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={[styles.path, primary && styles.pathPrimary]}>
      <View style={[styles.pathIcon, primary && styles.pathIconPrimary]}>
        <Feather name={icon} size={28} color={primary ? "#FFFFFF" : colors.clay} />
      </View>
      <Text style={[type.title, { color: primary ? "#FFFFFF" : colors.ink, marginTop: space.md }]}>
        {title}
      </Text>
      <Text
        style={[
          type.caption,
          { color: primary ? "rgba(255,255,255,0.9)" : colors.inkSoft, marginTop: 2 },
        ]}
      >
        {body}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: GUTTER },
  head: { paddingTop: space.xl, paddingBottom: space.lg, gap: space.xs },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.5,
    color: colors.ink,
  },
  paths: {
    flex: 1,
    justifyContent: "center",
    gap: space.md,
    paddingBottom: TAB_BAR_SPACE,
  },
  path: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.lg + 2,
    ...shadow.card,
  },
  pathPrimary: { backgroundColor: colors.clay, ...shadow.raised },
  pathIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.claySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  pathIconPrimary: { backgroundColor: "rgba(255,255,255,0.18)" },
});
