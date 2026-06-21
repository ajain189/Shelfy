import React, { useState, useEffect, useCallback } from "react";
import { Text, StyleSheet, TextInput, Alert } from "react-native";

import { colors, space, type, radius, fonts } from "../theme";
import { CollapsingScreen } from "../components/CollapsingScreen";
import { Card, Button, SafetyBadge } from "../components/ui";
import { BrandMark } from "../components/BrandMark";
import { UserGuide } from "../components/UserGuide";
import { loadApiKey, setApiKey, hasBundledKey, maskKey } from "../ai/apiKeyStore";
import { clearAll, countItems } from "../db/inventory";
import { seedAll } from "../db/seed";

/**
 * Settings, enter a Gemini API key in-app (no file editing) and reset the demo
 * inventory.
 */
export function SettingsScreen() {
  const [keyInput, setKeyInput] = useState("");
  const [activeKey, setActiveKey] = useState("");
  const [count, setCount] = useState(0);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(() => {
    loadApiKey().then(setActiveKey);
    countItems().then(setCount).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onSaveKey = useCallback(async () => {
    setSaving(true);
    await setApiKey(keyInput);
    setKeyInput("");
    await loadApiKey().then(setActiveKey);
    setSaving(false);
    Alert.alert("Saved", "Your Gemini key is set. The Intake tab can now scan labels.");
  }, [keyInput]);

  const onResetData = useCallback(() => {
    Alert.alert(
      "Reset demo data",
      "This wipes the pantry and reloads the seeded sample items. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await clearAll();
            await seedAll();
            setCount(await countItems());
            Alert.alert("Done", "Sample inventory reloaded.");
          },
        },
      ],
    );
  }, []);

  return (
    <CollapsingScreen title="Settings">
      <BrandMark />

      <UserGuide />

      <Card style={{ gap: space.md }}>
        <Text style={type.heading}>Gemini API key</Text>
        {activeKey ? (
          <SafetyBadge tone="safe" label={`Key set · ${maskKey(activeKey)}`} />
        ) : (
          <SafetyBadge tone="caution" label="No key set" />
        )}
        <Text style={[type.body, { color: colors.inkSoft }]}>
          Paste a Gemini key to enable label scanning. Get a free one at{" "}
          <Text style={{ fontFamily: fonts.bodyBold }}>aistudio.google.com/apikey</Text>.
        </Text>
        <TextInput
          value={keyInput}
          onChangeText={setKeyInput}
          placeholder="AIza…"
          placeholderTextColor={colors.inkFaint}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          style={styles.input}
        />
        <Button
          label={saving ? "Saving…" : "Save key"}
          onPress={onSaveKey}
          disabled={saving || keyInput.trim().length === 0}
        />
        {hasBundledKey && (
          <Text style={[type.caption, { color: colors.inkFaint }]}>
            A key was also bundled at build time; a key you set here overrides it.
          </Text>
        )}
      </Card>

      <Card style={{ gap: space.md }}>
        <Text style={type.heading}>Demo data</Text>
        <Text style={[type.body, { color: colors.inkSoft }]}>
          The pantry currently holds {count} item{count === 1 ? "" : "s"}. Reset to reload the
          seeded sample inventory (canned goods, pasta, baby food, and a couple of items that
          demonstrate the recall and allergen flags).
        </Text>
        <Button label="Reset demo data" tone="ghost" onPress={onResetData} />
      </Card>

      <Card style={{ gap: space.sm }}>
        <Text style={type.heading}>About</Text>
        <Text style={[type.body, { color: colors.inkSoft }]}>
          ShelfSight reads donated food labels, flags allergens and recalls, and builds a pantry a
          family can search in plain language. A volunteer clears every item before it reaches the
          shelf.
        </Text>
        <Text style={[type.caption, { color: colors.inkFaint }]}>
          Demo key handling: the key is used on-device only. A production build would route model
          calls through a backend proxy so the key never ships to a phone.
        </Text>
      </Card>
    </CollapsingScreen>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.paperDeep,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 3,
    ...type.mono,
    color: colors.ink,
  },
});
