import React, { useState, useEffect, useCallback } from "react";
import { Text, StyleSheet, TextInput, Alert } from "react-native";

import { colors, space, type, radius, fonts } from "../theme";
import { CollapsingScreen } from "../components/CollapsingScreen";
import { Card, Button, SafetyBadge } from "../components/ui";
import { BrandMark } from "../components/BrandMark";
import { UserGuide } from "../components/UserGuide";
import { loadApiKey, setApiKey, hasBundledKey } from "../ai/apiKeyStore";
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
    Alert.alert("Done", "Label reading is on. Head to the Scan tab to add a donation.");
  }, [keyInput]);

  const onResetData = useCallback(() => {
    Alert.alert(
      "Start over with sample food?",
      "This empties the pantry and loads the sample foods again. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start over",
          style: "destructive",
          onPress: async () => {
            await clearAll();
            await seedAll();
            setCount(await countItems());
            Alert.alert("Done", "The sample pantry is back.");
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
        <Text style={type.heading}>Turn on label reading</Text>
        {activeKey ? (
          <SafetyBadge tone="safe" label="Reading is on" />
        ) : (
          <SafetyBadge tone="caution" label="Reading is off" />
        )}
        <Text style={[type.body, { color: colors.inkSoft }]}>
          Shelfy uses Google's free Gemini to read labels. Paste a key here once to switch it
          on, you can get one in about a minute at{" "}
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
          label={saving ? "Turning on…" : "Turn on reading"}
          onPress={onSaveKey}
          disabled={saving || keyInput.trim().length === 0}
        />
        {hasBundledKey && (
          <Text style={[type.caption, { color: colors.inkFaint }]}>
            A key already came with the app; the one you paste here is used instead.
          </Text>
        )}
      </Card>

      <Card style={{ gap: space.md }}>
        <Text style={type.heading}>Sample pantry</Text>
        <Text style={[type.body, { color: colors.inkSoft }]}>
          The pantry holds {count} food{count === 1 ? "" : "s"} right now. Start over to load the
          sample foods again, canned goods, pasta, baby food, and a few that show the recall and
          allergen warnings.
        </Text>
        <Button label="Start over with sample food" tone="ghost" onPress={onResetData} />
      </Card>

      <Card style={{ gap: space.sm }}>
        <Text style={type.heading}>About</Text>
        <Text style={[type.body, { color: colors.inkSoft }]}>
          Shelfy reads donated food labels, warns about allergens and recalls, and builds a
          pantry a family can search in plain words. A volunteer checks every item before it reaches
          the shelf.
        </Text>
        <Text style={[type.caption, { color: colors.inkFaint }]}>
          Your key stays on this phone and is only used to read labels.
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
