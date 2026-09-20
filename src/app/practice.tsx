import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Mcq } from "@/components/mcq";
import { Flashcard } from "@/components/flashcard";
import { FillInTheBlank } from "@/components/fillintheblank";
import { generatePracticeActivity, loadPracticeEncounters, type ActivityKind, type PracticeActivity } from "@/lib/practice";

const kinds: ActivityKind[] = ["mcq", "fillintheblank", "flashcard"];
const labels = { mcq: "Multiple choice", fillintheblank: "Fill in the blank", flashcard: "Flashcard" };
const randomItem = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

export default function PracticePage() {
  const insets = useSafeAreaInsets();
  const [encounters, setEncounters] = useState<string[]>([]);
  const [activity, setActivity] = useState<PracticeActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [version, setVersion] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const busy = useRef(false);

  async function next(ids = encounters, kind = randomItem(kinds)) {
    if (busy.current || !ids.length) return;
    busy.current = true;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const timeout = setTimeout(() => request.abort(), 60000);
    setLoading(true); setError(""); setActivity(null); setAnswer(null); setRevealed(false);
    Keyboard.dismiss();
    try {
      const candidates = ids.length > 1 ? ids.filter((id) => id !== activity?.encounterId) : ids;
      const result = await generatePracticeActivity(randomItem(candidates), kind, request.signal);
      if (controller.current === request && !request.signal.aborted) {
        setActivity(result); setVersion((v) => v + 1);
      }
    } catch (err) {
      if (controller.current === request) setError(request.signal.aborted ? "The request timed out. Please retry." : err instanceof Error ? err.message : "Could not load an activity.");
    } finally {
      clearTimeout(timeout);
      if (controller.current === request) { busy.current = false; setLoading(false); }
    }
  }

  useEffect(() => {
    let active = true;
    void loadPracticeEncounters().then((ids) => {
      if (!active) return;
      setEncounters(ids);
      if (ids.length) void next(ids, "mcq");
      else setLoading(false);
    }).catch((err) => { if (active) { setError(err instanceof Error ? err.message : "Could not load encounters."); setLoading(false); } });
    return () => { active = false; controller.current?.abort(); controller.current = null; busy.current = false; };
  }, []);

  async function retry() {
    if (encounters.length) { void next(); return; }
    setLoading(true); setError("");
    try {
      const ids = await loadPracticeEncounters(); setEncounters(ids);
      if (ids.length) await next(ids, "mcq"); else setLoading(false);
    } catch { setLoading(false); setError("Could not load encounters. Please retry."); }
  }

  const swipe = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => !loading && encounters.length > 0 && gesture.dx > 25 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderRelease: (_, gesture) => { if (gesture.dx > 70) void next(); },
  });
  function reveal(value: string | null = null) { setAnswer(value); setRevealed(true); Keyboard.dismiss(); }

  return <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
    <Stack.Screen options={{ gestureEnabled: false }} />
    <View style={styles.container} {...swipe.panHandlers}>
      <ScrollView key={version} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: insets.top + 36 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Exit practice" onPress={() => router.back()} style={styles.exit}>
          <Text style={styles.message}>← Back</Text>
        </Pressable>
        {loading ? <><ActivityIndicator color="#262626" /><Text style={styles.message}>Preparing your activity…</Text></> : error ?
          <><Text style={styles.message}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void retry()} style={styles.retry}><Text>Retry</Text></Pressable></> :
          !activity ? <Text style={styles.message}>Add an encounter first to start practicing.</Text> : <>
            <Text style={styles.label}>{labels[activity.kind]}</Text>
            {activity.kind === "mcq" ? <Mcq activity={activity} answer={answer} revealed={revealed} onAnswer={reveal} /> :
              activity.kind === "flashcard" ? <Flashcard activity={activity} revealed={revealed} onReveal={() => reveal()} /> :
              <FillInTheBlank activity={activity} revealed={revealed} onAnswer={reveal} />}
          </>}
      </ScrollView>
      {activity && !loading && <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Skip to next activity" onPress={() => void next()} style={styles.next}>
          <Text style={styles.message}>{revealed ? "Next activity →" : "Swipe right to skip →"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Don't know. Show answer" disabled={revealed}
          onPress={() => reveal()} style={[styles.unknown, revealed && { opacity: 0.3 }]}><Text style={styles.questionMark}>?</Text></Pressable>
      </View>}
    </View>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24, gap: 18 },
  label: { color: "#525252", fontSize: 15 },
  exit: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  message: { color: "#262626", fontSize: 16, lineHeight: 24 },
  retry: { padding: 16, backgroundColor: "#F0F0F0", borderRadius: 12, alignSelf: "flex-start" },
  footer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, backgroundColor: "white" },
  next: { flex: 1, paddingVertical: 16 },
  unknown: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  questionMark: { color: "#262626", fontSize: 30, fontWeight: "500" },
});
