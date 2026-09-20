import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { File } from "expo-file-system";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ensureUser } from "@/lib/ensureUser";
import { addListenEncounter } from "@/lib/encounters";
import { LANGUAGES, type LanguageCode } from "@/lib/languages";
import { uploadCompressedRecording } from "@/lib/recordings";
import { loadUserLanguages } from "@/lib/userLanguages";

const TRANSCRIPTION_URL = process.env.EXPO_PUBLIC_TRANSCRIPTION_URL;
const LISTEN_LANGUAGE_KEY = "listen-language";
type ListenPhase = "idle" | "listening" | "transcribing" | "review" | "saving";

export default function ListenPage() {
  const insets = useSafeAreaInsets();
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [transcript, setTranscript] = useState("");
  const [phase, setPhase] = useState<ListenPhase>("idle");
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"error" | "success" | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [languageOptions, setLanguageOptions] = useState<LanguageCode[]>(LANGUAGES.map(({ code }) => code));
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("en");
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

  useEffect(() => {
    void setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  }, []);

  useEffect(() => {
    let active = true;
    async function loadListenLanguage() {
      try {
        const [storedLanguage, user] = await Promise.all([
          AsyncStorage.getItem(LISTEN_LANGUAGE_KEY),
          ensureUser(),
        ]);
        const userLanguages = await loadUserLanguages(user.uid);
        const options = userLanguages.targetLanguage.length
          ? userLanguages.targetLanguage
          : LANGUAGES.map(({ code }) => code);
        const nextLanguage = options.includes(storedLanguage as LanguageCode)
          ? storedLanguage as LanguageCode
          : options[0];
        if (active && nextLanguage) {
          setLanguageOptions(options);
          setSelectedLanguage(nextLanguage);
        }
      } catch (error) {
        console.error("Failed to load Listen language", error);
      }
    }
    void loadListenLanguage();
    return () => { active = false; };
  }, []);

  async function selectLanguage(language: LanguageCode) {
    setSelectedLanguage(language);
    setLanguageMenuOpen(false);
    await AsyncStorage.setItem(LISTEN_LANGUAGE_KEY, language);
  }

  async function startRecording() {
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Microphone access needed", "Allow microphone access in Settings to record.");
      return;
    }

    await recorder.prepareToRecordAsync({ directory: "document" });
    recorder.record();
    setPhase("listening");
    setMessage("");
    setMessageKind(null);
    setTranscript("");
    setRecordingUri(null);
  }

  async function stopRecording() {
    try {
      await recorder.stop();
      if (!recorder.uri) throw new Error("The recording file was not created.");
      setRecordingUri(recorder.uri);
      await transcribeRecording(recorder.uri);
    } catch (error) {
      setPhase("idle");
      setMessage(error instanceof Error ? error.message : "Could not stop recording. Try again.");
      setMessageKind("error");
    }
  }

  async function transcribeRecording(uri: string) {
    if (!TRANSCRIPTION_URL) {
      setPhase("idle");
      setMessage("Transcription server not configured. Add EXPO_PUBLIC_TRANSCRIPTION_URL to .env, then fully restart Expo.");
      setMessageKind("error");
      return;
    }
    setPhase("transcribing");
    setMessage("");
    setMessageKind(null);
    try {
      const formData = new FormData();
      formData.append("audio", new File(uri));
      formData.append("language", selectedLanguage);

      const response = await fetch(`${TRANSCRIPTION_URL}/transcribe`, { method: "POST", body: formData });
      const result = await response.json() as { text?: string; detail?: string };
      if (!response.ok || !result.text) {
        throw new Error(result.detail ?? "Transcription failed.");
      }

      const text = result.text.trim();
      setTranscript(text);
      setPhase("review");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Try again.";
      const isNetworkError = /fetch failed|could not connect|network request failed/i.test(message);
      setPhase("idle");
      setMessage(
        isNetworkError
          ? "The app could not reach the transcription server. Start server.py and set EXPO_PUBLIC_TRANSCRIPTION_URL to your computer’s local-network address."
          : message
      );
      setMessageKind("error");
    }
  }

  function resetListenPage() {
    setPhase("idle");
    setTranscript("");
    setRecordingUri(null);
    setMessage("");
    setMessageKind(null);
  }

  async function saveReviewedRecording() {
    if (!recordingUri || !transcript) return;
    setPhase("saving");
    setMessage("");
    setMessageKind(null);
    try {
      const user = await ensureUser();
      const storagePath = await uploadCompressedRecording(user.uid, recordingUri, selectedLanguage);
      await addListenEncounter(user.uid, selectedLanguage, transcript, storagePath);
      setPhase("idle");
      setMessage("Recording and transcription saved.");
      setMessageKind("success");
      setTimeout(resetListenPage, 1600);
    } catch (error) {
      setPhase("review");
      setMessage(error instanceof Error ? error.message : "Could not save the recording. Try again or discard it.");
      setMessageKind("error");
    }
  }

  const isRecording = recorderState.isRecording || phase === "listening";
  const isWorking = phase === "transcribing" || phase === "saving";
  const selectedLanguageName = LANGUAGES.find(({ code }) => code === selectedLanguage)?.label ?? selectedLanguage;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{phase === "listening" ? "Listening..." : phase === "transcribing" ? "Transcribing..." : phase === "saving" ? "Saving..." : ""}</Text>
        {transcript ? <Text style={styles.transcript}>{transcript}</Text> : null}
        {message ? <Text style={[styles.message, messageKind === "error" ? styles.errorMessage : styles.successMessage]}>{message}</Text> : null}
      </View>
      <View style={[styles.languageSelector, { top: insets.top + 16, right: 20 }]}>
        {languageMenuOpen && (
          <View style={styles.languageMenu}>
            {languageOptions.map((code) => {
              const language = LANGUAGES.find((item) => item.code === code);
              const isSelected = code === selectedLanguage;
              return (
                <Pressable
                  key={code}
                  accessibilityRole="radio"
                  accessibilityLabel={language?.label ?? code.toUpperCase()}
                  accessibilityState={{ checked: isSelected }}
                  onPress={() => void selectLanguage(code)}
                  style={({ pressed }) => [styles.languageOption, isSelected && styles.selectedLanguageOption, pressed && styles.pressedLanguageOption]}
                >
                  <Text style={styles.languageOptionName}>{language?.label ?? code}</Text>
                  <Text style={styles.languageOptionCode}>{code.toUpperCase()}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Change listening language from ${selectedLanguageName}`}
          accessibilityState={{ expanded: languageMenuOpen }}
          onPress={() => setLanguageMenuOpen((open) => !open)}
          style={({ pressed }) => [styles.languageLabel, pressed && styles.pressedLanguageLabel]}
        >
          <Text style={styles.languageLabelText}>{selectedLanguage.toUpperCase()}</Text>
        </Pressable>
      </View>
      <View style={[styles.bottomControls, { bottom: insets.bottom + 24 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Discard recording and transcript"
          accessibilityState={{ disabled: isWorking || (!recordingUri && !transcript && !message) }}
          disabled={isWorking || (!recordingUri && !transcript && !message)}
          onPress={resetListenPage}
          style={({ pressed }) => [styles.iconOnlyButton, pressed && styles.iconOnlyPressed]}
        >
          <SymbolView name={{ ios: "xmark", android: "close", web: "close" }} size={24} tintColor="#262626" style={styles.controlIcon} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isRecording ? "Stop recording" : "Start recording"}
          accessibilityState={{ disabled: isWorking || phase === "review" }}
          disabled={isWorking || phase === "review"}
          onPress={() => void (isRecording ? stopRecording() : startRecording())}
          style={({ pressed }) => [styles.microphoneButton, isRecording && styles.recordingButton, pressed && styles.pressedButton]}
        >
          <SymbolView
            name={{ ios: isRecording ? "stop.fill" : "mic.fill", android: isRecording ? "stop" : "mic", web: isRecording ? "stop" : "mic" }}
            size={28}
            tintColor="#FFFFFF"
            style={styles.microphoneIcon}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Transcribe and save recording"
          accessibilityState={{ disabled: phase !== "review" }}
          disabled={phase !== "review"}
          onPress={() => void saveReviewedRecording()}
          style={({ pressed }) => [styles.iconOnlyButton, pressed && styles.iconOnlyPressed]}
        >
          <SymbolView name={{ ios: "checkmark", android: "check", web: "check" }} size={24} tintColor="#262626" style={styles.controlIcon} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
  },
  title: {
    color: "#262626",
    fontSize: 24,
    fontWeight: "600",
  },
  transcript: {
    color: "#525252",
    fontSize: 18,
    lineHeight: 28,
    marginTop: 28,
  },
  message: { fontSize: 16, lineHeight: 24, marginTop: 20 },
  errorMessage: { color: "#B42318" },
  successMessage: { color: "#147A3E" },
  microphoneButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
  },
  recordingButton: { backgroundColor: "#B42318" },
  microphoneIcon: { width: 28, height: 28 },
  bottomControls: { position: "absolute", alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 32 },
  iconOnlyButton: { width: 48, height: 64, alignItems: "center", justifyContent: "center" },
  iconOnlyPressed: { opacity: 0.5 },
  controlIcon: { width: 24, height: 24 },
  pressedButton: { backgroundColor: "#525252", transform: [{ scale: 0.95 }] },
  languageSelector: { position: "absolute", alignItems: "flex-end" },
  languageLabel: { minWidth: 48, height: 32, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#F0F0F0", alignItems: "center", justifyContent: "center" },
  pressedLanguageLabel: { backgroundColor: "#DCDCDC" },
  languageLabelText: { fontSize: 13, fontWeight: "600", letterSpacing: 0.8, color: "#262626" },
  languageMenu: { position: "absolute", top: 40, right: 0, width: 180, borderWidth: 1, borderColor: "#E5E5E5", borderRadius: 12, backgroundColor: "#FFFFFF", overflow: "hidden", elevation: 4, shadowColor: "#000000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8 },
  languageOption: { minHeight: 44, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selectedLanguageOption: { backgroundColor: "#F0F0F0" },
  pressedLanguageOption: { backgroundColor: "#E5E5E5" },
  languageOptionName: { fontSize: 15, color: "#262626" },
  languageOptionCode: { fontSize: 12, fontWeight: "600", color: "#737373" },
});
