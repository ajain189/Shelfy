import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Image, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { colors, space, type, fonts, radius } from "../theme";
import { CollapsingScreen } from "../components/CollapsingScreen";
import { Button, Card, SafetyBadge } from "../components/ui";
import { PressableScale } from "../components/PressableScale";
import { IntakeResultCard } from "../components/IntakeResultCard";
import { useImageSource } from "../image/useImageSource";
import { downscaleToBase64 } from "../image/processImage";
import { runIntake, type IntakeResult } from "../ai/geminiClient";
import { addIntake, countItems } from "../db/inventory";
import { loadApiKey } from "../ai/apiKeyStore";

type Phase = "idle" | "processing" | "reading" | "result" | "error";

/**
 * Volunteer intake: collect one OR MORE photos of an item (front, ingredients,
 * date — useful for big or curved labels) → Gemini reads across all of them →
 * one structured record → add to the pantry.
 */
export function IntakeScreen() {
  const { takePhoto, pickPhotos } = useImageSource();

  const [keyReady, setKeyReady] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [photos, setPhotos] = useState<string[]>([]); // captured/picked image URIs
  const [statusText, setStatusText] = useState("");
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [error, setError] = useState("");
  const [count, setCount] = useState(0);
  const [savedId, setSavedId] = useState<number | null>(null);

  const refreshKey = useCallback(() => {
    loadApiKey().then((k) => setKeyReady(k.length > 0));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshKey();
      countItems().then(setCount).catch(() => {});
    }, [refreshKey]),
  );

  const addFromCamera = useCallback(async () => {
    const uri = await takePhoto();
    if (uri) setPhotos((p) => [...p, uri]);
  }, [takePhoto]);

  const addFromLibrary = useCallback(async () => {
    const uris = await pickPhotos();
    if (uris.length) setPhotos((p) => [...p, ...uris]);
  }, [pickPhotos]);

  const removePhoto = useCallback((idx: number) => {
    setPhotos((p) => p.filter((_, i) => i !== idx));
  }, []);

  const analyze = useCallback(async () => {
    if (photos.length === 0) return;
    setResult(null);
    setSavedId(null);
    setError("");
    try {
      setPhase("processing");
      setStatusText(photos.length > 1 ? `Preparing ${photos.length} photos…` : "Preparing image…");
      const images = await Promise.all(photos.map((uri) => downscaleToBase64(uri).then((r) => r.base64)));

      setPhase("reading");
      setStatusText("Reading the label…");
      const intake = await runIntake(images);
      setResult(intake);
      setPhase("result");
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setPhase("error");
    }
  }, [photos]);

  const save = useCallback(async () => {
    if (!result) return;
    try {
      const id = await addIntake({
        extraction: result.extraction,
        raw_json: JSON.stringify(result.extraction),
        image_uris: photos, // keep the photos so the card/detail can show them
      });
      setSavedId(id);
      setCount(await countItems());
    } catch (e: any) {
      setError(`Save failed: ${e?.message ?? String(e)}`);
      setPhase("error");
    }
  }, [result, photos]);

  const reset = useCallback(() => {
    setPhase("idle");
    setPhotos([]);
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
            Add a photo of the label. For big or curved labels, add a few — front, ingredients, and
            the date — and ShelfSight reads across all of them.
          </Text>

          {photos.length > 0 && (
            <View style={styles.thumbRow}>
              {photos.map((uri, i) => (
                <View key={`${uri}-${i}`} style={styles.thumbWrap}>
                  <Image source={{ uri }} style={styles.thumb} />
                  <Pressable style={styles.thumbX} onPress={() => removePhoto(i)} hitSlop={8}>
                    <Feather name="x" size={13} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <View style={styles.addRow}>
            <PressableScale style={styles.addBtn} onPress={addFromCamera} disabled={noKey}>
              <Feather name="camera" size={16} color={colors.clay} />
              <Text style={[type.label, { color: colors.clay }]}>
                {photos.length ? "Add photo" : "Scan a label"}
              </Text>
            </PressableScale>
            <PressableScale style={styles.addBtn} onPress={addFromLibrary} disabled={noKey}>
              <Feather name="image" size={16} color={colors.clay} />
              <Text style={[type.label, { color: colors.clay }]}>Choose photos</Text>
            </PressableScale>
          </View>

          {photos.length > 0 && (
            <Button
              label={`Analyze item (${photos.length} photo${photos.length === 1 ? "" : "s"})`}
              onPress={analyze}
              disabled={noKey}
            />
          )}
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

const THUMB = 64;

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  thumbRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  thumbWrap: { width: THUMB, height: THUMB },
  thumb: { width: THUMB, height: THUMB, borderRadius: radius.sm, backgroundColor: colors.paperDeep },
  thumbX: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  addRow: { flexDirection: "row", gap: space.sm },
  addBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs + 1,
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
  },
  footer: {
    marginTop: space.sm,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    alignItems: "center",
  },
});
