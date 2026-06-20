import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { colors, space, type, fonts } from "../theme";
import { CollapsingScreen } from "../components/CollapsingScreen";
import { Button, Card, SafetyBadge } from "../components/ui";
import { IntakeResultCard } from "../components/IntakeResultCard";
import { useImageSource } from "../image/useImageSource";
import { downscaleToBase64 } from "../image/processImage";
import { runIntake, type IntakeResult } from "../ai/geminiClient";
import { addIntake, countItems } from "../db/inventory";
import { loadApiKey } from "../ai/apiKeyStore";

type Phase = "idle" | "processing" | "reading" | "result" | "error";

/**
 * Volunteer intake: scan a donated item → Gemini reads the label → structured
 * result on screen → add to the pantry (cleared=0; a human clears it later from
 * the Inventory tab).
 */
export function IntakeScreen() {
  const { takePhoto, pickPhoto } = useImageSource();

  const [keyReady, setKeyReady] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusText, setStatusText] = useState("");
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [error, setError] = useState("");
  const [count, setCount] = useState(0);
  const [savedId, setSavedId] = useState<number | null>(null);

  const refreshKey = useCallback(() => {
    loadApiKey().then((k) => setKeyReady(k.length > 0));
  }, []);

  // Re-check the key (and item count) every time the tab regains focus — so a
  // key entered on the Settings tab takes effect when you come back here,
  // without needing to relaunch the app.
  useFocusEffect(
    useCallback(() => {
      refreshKey();
      countItems().then(setCount).catch(() => {});
    }, [refreshKey]),
  );

  const scan = useCallback(
    async (source: "camera" | "library") => {
      setResult(null);
      setSavedId(null);
      setError("");
      try {
        const uri = source === "camera" ? await takePhoto() : await pickPhoto();
        if (!uri) return;

        setPhase("processing");
        setStatusText("Preparing image…");
        const { base64 } = await downscaleToBase64(uri);

        setPhase("reading");
        setStatusText("Reading the label…");
        const intake = await runIntake(base64);
        setResult(intake);
        setPhase("result");
      } catch (e: any) {
        setError(e?.message ?? String(e));
        setPhase("error");
      }
    },
    [takePhoto, pickPhoto],
  );

  const save = useCallback(async () => {
    if (!result) return;
    try {
      const id = await addIntake({
        extraction: result.extraction,
        raw_json: JSON.stringify(result.extraction),
      });
      setSavedId(id);
      setCount(await countItems());
    } catch (e: any) {
      setError(`Save failed: ${e?.message ?? String(e)}`);
      setPhase("error");
    }
  }, [result]);

  const reset = useCallback(() => {
    setPhase("idle");
    setResult(null);
    setError("");
    setSavedId(null);
    refreshKey();
  }, [refreshKey]);

  const busy = phase === "processing" || phase === "reading";
  const noKey = keyReady === false;

  return (
    <CollapsingScreen title="Intake" subtitle="The pantry shelf is the document. Let's read it.">
      {noKey && (
        <Card style={{ gap: space.sm }}>
          <SafetyBadge tone="caution" label="No API key" />
          <Text style={[type.body, { color: colors.inkSoft }]}>
            Add your Gemini key in the{" "}
            <Text style={{ fontFamily: fonts.bodyBold }}>Settings</Text> tab to scan labels. A free
            key takes a minute at aistudio.google.com/apikey.
          </Text>
        </Card>
      )}

      {phase === "idle" && (
        <Card style={{ gap: space.md }}>
          <Text style={type.heading}>Scan a donation</Text>
          <Text style={[type.body, { color: colors.inkSoft }]}>
            Point the camera at a donated item. ShelfSight reads the label and builds a structured
            record for the shelf.
          </Text>
          <Button label="Scan a label" onPress={() => scan("camera")} disabled={noKey} />
          <Button
            label="Choose a photo"
            tone="ghost"
            onPress={() => scan("library")}
            disabled={noKey}
          />
        </Card>
      )}

      {busy && (
        <Card style={[styles.center, { gap: space.md, paddingVertical: space.xl }]}>
          <ActivityIndicator color={colors.clay} size="large" />
          <Text style={[type.heading, { color: colors.ink }]}>{statusText}</Text>
          <Text style={[type.caption, { color: colors.inkFaint }]}>
            Gemini is reading the label.
          </Text>
        </Card>
      )}

      {phase === "result" && result && (
        <View style={{ gap: space.lg }}>
          <IntakeResultCard extraction={result.extraction} usage={result.usage} />
          {savedId === null ? (
            <Button label="Add to pantry" onPress={save} />
          ) : (
            <Card style={[styles.center, { gap: space.sm }]}>
              <SafetyBadge tone="safe" label={`Saved to pantry (#${savedId})`} />
              <Text style={[type.caption, { color: colors.inkFaint, textAlign: "center" }]}>
                Find it in the Inventory tab. A volunteer must clear it before it reaches a family.
              </Text>
            </Card>
          )}
          <Button label="Scan another" tone="ghost" onPress={reset} />
        </View>
      )}

      {phase === "error" && (
        <Card style={{ gap: space.md }}>
          <SafetyBadge tone="danger" label="Something went wrong" />
          <Text style={[type.body, { color: colors.inkSoft }]}>{error}</Text>
          <Button label="Try again" tone="ghost" onPress={reset} />
        </Card>
      )}

      <View style={styles.footer}>
        <Text style={[type.caption, { color: colors.inkFaint }]}>
          {count} item{count === 1 ? "" : "s"} in the pantry
        </Text>
      </View>
    </CollapsingScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  footer: {
    marginTop: space.sm,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    alignItems: "center",
  },
});
