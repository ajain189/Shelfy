import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors, space, radius, type } from "../theme";

/**
 * The agentic workflow, made visible. ShelfSight isn't one model call, it's a
 * pipeline that perceives, classifies, calls an external tool, and decides. This
 * trace shows that on the intake result so a judge (and a volunteer) can see the
 * reasoning steps that produced the verdict, not just the answer.
 *
 * Each step carries a short, item-specific result string so the trace reflects
 * THIS scan, not a canned animation.
 */
export interface TraceStep {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  detail: string;
}

export function PipelineTrace({ steps }: { steps: TraceStep[] }) {
  return (
    <View style={styles.wrap}>
      <Text style={[type.overline, { color: colors.inkFaint }]}>HOW THE AI READ THIS</Text>
      <View style={styles.steps}>
        {steps.map((s, i) => (
          <View key={i} style={styles.step}>
            <View style={styles.rail}>
              <View style={styles.node}>
                <Feather name={s.icon} size={14} color={colors.clay} />
              </View>
              {i < steps.length - 1 && <View style={styles.connector} />}
            </View>
            <View style={styles.stepText}>
              <Text style={[type.label, { color: colors.ink }]}>{s.label}</Text>
              <Text style={[type.caption, { color: colors.inkSoft }]}>{s.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.sm,
    backgroundColor: colors.paperDeep,
    borderRadius: radius.md,
    padding: space.md,
  },
  steps: { gap: 0 },
  step: { flexDirection: "row", gap: space.md },
  rail: { alignItems: "center", width: 30 },
  node: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.claySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  connector: { flex: 1, width: 2, backgroundColor: colors.lineStrong, marginVertical: 2 },
  stepText: { flex: 1, paddingBottom: space.md, gap: 1, paddingTop: 5 },
});
