import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Image, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { colors, space, type, fonts, radius, shadow } from "../theme";
import { CollapsingScreen } from "../components/CollapsingScreen";
import { Button, Card, SafetyBadge } from "../components/ui";
import { BrandMark } from "../components/BrandMark";
import { PressableScale } from "../components/PressableScale";
import { IntakeResultCard } from "../components/IntakeResultCard";
import { RecallNotice } from "../components/RecallNotice";
import { useImageSource } from "../image/useImageSource";
import { downscaleToBase64 } from "../image/processImage";
import { runIntake, type IntakeResult } from "../ai/geminiClient";
import { addIntake, countItems } from "../db/inventory";
import { loadApiKey } from "../ai/apiKeyStore";
import { checkRecall, routingFor, type RecallResult } from "../recall/recallService";

type Phase = "idle" | "processing" | "reading" | "checking" | "result" | "error";

/**
 * Volunteer intake: collect one OR MORE photos of an item (front, ingredients,
 * date, useful for big or curved labels) → Gemini reads across all of them →
 * one structured record → add to the pantry.
 */
export function IntakeScreen() {
  const { takePhoto, pickPhotos } = useImageSource();

  const [keyReady, setKeyReady] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [photos, setPhotos] = useState<string[]>([]); // captured/picked image URIs
  const [statusText, setStatusText] = useState("");
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [recall, setRecall] = useState<RecallResult | null>(null);
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
    setRecall(null);
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

      // Live recall retrieval, the agentic external-tool step. Never throws; the
      // worst case escalates. Runs after the read so it can query by brand/product.
      setPhase("checking");
      setStatusText("Checking FDA recalls…");
      const rec = await checkRecall(intake.extraction.brand, intake.extraction.product_name);
      setRecall(rec);

      setPhase("result");
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setPhase("error");
    }
  }, [photos]);

  const save = useCallback(async () => {
    if (!result) return;
    try {
      // Fold the recall verdict into raw_json so the detail sheet shows the
      // citation, class, and explanation, and into the queryable columns so the
      // shelf/clearance guards see the recall state.
      const recall_state = recall?.recall_state ?? "unknown";
      const raw = {
        ...result.extraction,
        recall_state,
        recall_class: recall?.recall_class ?? "",
        recall_explanation: recall?.recall_explanation ?? "",
        recall_citations: recall?.citations ?? [],
        recall_path: recall?.path ?? "none",
        routing: routingFor(recall_state),
      };
      const id = await addIntake({
        extraction: result.extraction,
        recall_state,
        routing: routingFor(recall_state),
        raw_json: JSON.stringify(raw),
        image_uris: photos, // keep the photos so the card/detail can show them
      });
      setSavedId(id);
      setCount(await countItems());
    } catch (e: any) {
      setError(`Save failed: ${e?.message ?? String(e)}`);
      setPhase("error");
    }
  }, [result, recall, photos]);

  const reset = useCallback(() => {
    setPhase("idle");
    setPhotos([]);
    setResult(null);
    setRecall(null);
    setError("");
    setSavedId(null);
    refreshKey();
  }, [refreshKey]);

  const busy = phase === "processing" || phase === "reading" || phase === "checking";
  const noKey = keyReady === false;

  return (
    <CollapsingScreen title="Add a donation" subtitle="Take a photo of the label, Shelfy reads it for you.">
      {noKey && (
        <Card style={{ gap: space.sm }}>
          <SafetyBadge tone="caution" label="Scanning is off" />
          <Text style={[type.body, { color: colors.inkSoft }]}>
            Turn on label reading in the{" "}
            <Text style={{ fontFamily: fonts.bodyBold }}>Settings</Text> tab, it takes a minute.
            Until then, you can't add photos.
          </Text>
        </Card>
      )}

      {phase === "idle" && (
        <Card style={{ gap: space.md }}>
          <BrandMark size={48} />
          {photos.length === 0 ? (
            <Text style={[type.body, { color: colors.inkSoft }]}>
              Point the camera at the food label. If it's big or curved, add a few photos, the
              front, the ingredients, and the date, and Shelfy reads across all of them.
            </Text>
          ) : (
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

          {/* ONE primary action. With no photos it's "Take a photo"; once a photo
              is added it becomes "Read this label". Everything else (choose from
              library, add more) is smaller and secondary. */}
          {photos.length === 0 ? (
            <>
              <PrimaryAction icon="camera" label="Take a photo" onPress={addFromCamera} disabled={noKey} />
              <PressableScale style={styles.secondary} onPress={addFromLibrary} disabled={noKey}>
                <Feather name="image" size={16} color={colors.clay} />
                <Text style={[type.label, { color: colors.clay }]}>Choose from my photos</Text>
              </PressableScale>
            </>
          ) : (
            <>
              <PrimaryAction icon="check" label="Read this label" onPress={analyze} disabled={noKey} />
              <View style={styles.addRow}>
                <PressableScale style={styles.secondary} onPress={addFromCamera} disabled={noKey}>
                  <Feather name="camera" size={16} color={colors.clay} />
                  <Text style={[type.label, { color: colors.clay }]}>Add another</Text>
                </PressableScale>
                <PressableScale style={styles.secondary} onPress={addFromLibrary} disabled={noKey}>
                  <Feather name="image" size={16} color={colors.clay} />
                  <Text style={[type.label, { color: colors.clay }]}>Choose more</Text>
                </PressableScale>
              </View>
            </>
          )}
        </Card>
      )}

      {busy && (
        <Card style={[styles.center, { gap: space.md, paddingVertical: space.xl }]}>
          <ActivityIndicator color={colors.clay} size="large" />
          <Text style={[type.heading, { color: colors.ink }]}>{statusText}</Text>
          <Text style={[type.caption, { color: colors.inkFaint }]}>
            {phase === "checking"
              ? "Checking official recall records."
              : "This takes a few seconds."}
          </Text>
        </Card>
      )}

      {phase === "result" && result && (
        <View style={{ gap: space.lg }}>
          <IntakeResultCard extraction={result.extraction} usage={result.usage} recall={recall} />
          {recall && <RecallNotice recall={recall} />}
          {savedId === null ? (
            <Button label="Add it to the pantry" onPress={save} />
          ) : (
            <Card style={[styles.center, { gap: space.sm }]}>
              <SafetyBadge tone="safe" label="Added to the pantry" />
              <Text style={[type.caption, { color: colors.inkFaint, textAlign: "center" }]}>
                Next: open the Sort tab and decide if it goes on the shelf. Nothing reaches a family
                until a volunteer checks it.
              </Text>
            </Card>
          )}
          <Button label="Add another" tone="ghost" onPress={reset} />
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
          {count} food{count === 1 ? "" : "s"} in the pantry so far
        </Text>
      </View>
    </CollapsingScreen>
  );
}

/** The single big, finger-obvious action on the screen, with a leading icon. */
function PrimaryAction({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      style={[styles.primary, disabled ? { opacity: 0.4 } : null]}
    >
      <Feather name={icon} size={20} color="#FFFFFF" />
      <Text style={[type.bodyMedium, { color: "#FFFFFF" }]}>{label}</Text>
    </PressableScale>
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
  primary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    minHeight: 56,
    paddingVertical: space.md + 3,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.clay,
    ...shadow.card,
  },
  secondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs + 1,
    minHeight: 48,
    paddingVertical: space.sm + 2,
    borderRadius: radius.md,
  },
  footer: {
    marginTop: space.sm,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    alignItems: "center",
  },
});
