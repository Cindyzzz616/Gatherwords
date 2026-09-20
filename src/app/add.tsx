import { useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ensureUser } from "@/lib/ensureUser";
import { LANGUAGES, type LanguageCode, type LanguageField } from "@/lib/languages";
import { translateText } from "@/lib/translateText";
import { loadUserLanguages } from "@/lib/userLanguages";

function LanguageSelector({
  field,
  languages,
  selected,
  open,
  onToggle,
  onSelect,
}: {
  field: LanguageField;
  languages: LanguageCode[];
  selected: LanguageCode | null;
  open: boolean;
  onToggle: () => void;
  onSelect: (language: LanguageCode) => void;
}) {
  if (!selected) return null;

  return (
    <View style={styles.languageSelector}>
      {open && (
        <View style={styles.languageMenu}>
          {languages.map((code) => {
            const language = LANGUAGES.find((item) => item.code === code);
            const isSelected = code === selected;
            return (
              <Pressable
                key={code}
                accessibilityRole="radio"
                accessibilityLabel={language?.label ?? code.toUpperCase()}
                accessibilityState={{ checked: isSelected }}
                onPress={() => onSelect(code)}
                style={({ pressed }) => [
                  styles.languageOption,
                  isSelected && styles.selectedLanguageOption,
                  pressed && styles.pressedLanguageOption,
                ]}
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
        accessibilityLabel={`Change ${field === "targetLanguage" ? "target" : "native"} language`}
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={({ pressed }) => [styles.languageLabel, pressed && styles.pressedLanguageLabel]}
      >
        <Text style={styles.languageLabelText}>{selected.toUpperCase()}</Text>
      </Pressable>
    </View>
  );
}

export default function AddPage() {
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode | null>(null);
  const [nativeLanguage, setNativeLanguage] = useState<LanguageCode | null>(null);
  const [targetLanguages, setTargetLanguages] = useState<LanguageCode[]>([]);
  const [nativeLanguages, setNativeLanguages] = useState<LanguageCode[]>([]);
  const [openLanguageMenu, setOpenLanguageMenu] = useState<LanguageField | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<{
    top: string;
    bottom: string;
  } | null>(null);
  const translationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const translationController = useRef<AbortController | null>(null);
  const translationSequence = useRef(0);
  const lastEdited = useRef<"top" | "bottom" | null>(null);
  const topTextRef = useRef("");
  const bottomTextRef = useRef("");
  const canSubmit = Boolean(topText.trim() || bottomText.trim()) && !translating;
  const dismissKeyboardGesture = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          Keyboard.isVisible() &&
          gesture.numberActiveTouches === 1 &&
          gesture.dy > 40 &&
          gesture.dy > Math.abs(gesture.dx) * 1.5,
        onPanResponderGrant: () => Keyboard.dismiss(),
      }),
    [],
  );

  function scheduleTranslation(
    sourceField: "top" | "bottom",
    text: string,
    sourceLanguage: LanguageCode | null,
    targetLanguageCode: LanguageCode | null,
  ) {
    if (translationTimer.current) clearTimeout(translationTimer.current);
    translationController.current?.abort();
    const sequence = ++translationSequence.current;
    setTranslationError(null);

    if (!text.trim()) {
      setTranslating(false);
      if (sourceField === "top") setBottomText("");
      else setTopText("");
      return;
    }
    if (!sourceLanguage || !targetLanguageCode) {
      setTranslating(false);
      setTranslationError("Choose at least one native and target language in Settings.");
      return;
    }

    setTranslating(true);
    translationTimer.current = setTimeout(async () => {
      const controller = new AbortController();
      translationController.current = controller;
      try {
        const translated = await translateText(
          text.trim(),
          sourceLanguage,
          targetLanguageCode,
          controller.signal,
        );
        if (sequence === translationSequence.current) {
          if (sourceField === "top") setBottomText(translated);
          else setTopText(translated);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Translation failed", error);
        if (sequence === translationSequence.current) {
          setTranslationError(error instanceof Error ? error.message : "Translation failed.");
        }
      } finally {
        if (sequence === translationSequence.current) setTranslating(false);
      }
    }, 500);
  }

  useEffect(() => {
    let active = true;

    async function loadLanguages() {
      try {
        const user = await ensureUser();
        const languages = await loadUserLanguages(user.uid);
        if (active) {
          setTargetLanguages(languages.targetLanguage);
          setNativeLanguages(languages.nativeLanguage);
          setTargetLanguage(languages.targetLanguage[0] ?? null);
          setNativeLanguage(languages.nativeLanguage[0] ?? null);
          if (lastEdited.current === "top") {
            scheduleTranslation(
              "top",
              topTextRef.current,
              languages.targetLanguage[0] ?? null,
              languages.nativeLanguage[0] ?? null,
            );
          } else if (lastEdited.current === "bottom") {
            scheduleTranslation(
              "bottom",
              bottomTextRef.current,
              languages.nativeLanguage[0] ?? null,
              languages.targetLanguage[0] ?? null,
            );
          }
        }
      } catch (error) {
        console.error("Failed to load language labels", error);
      }
    }

    void loadLanguages();
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    translationSequence.current += 1;
    if (translationTimer.current) clearTimeout(translationTimer.current);
    translationController.current?.abort();
  }, []);

  function submit() {
    if (!canSubmit) return;
    setSubmission({ top: topText.trim(), bottom: bottomText.trim() });
    Keyboard.dismiss();
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        {...dismissKeyboardGesture.panHandlers}
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.inputField}>
          <TextInput
            style={[styles.input, styles.topInput]}
            accessibilityLabel="Top text"
            placeholder="Tap to enter text"
            placeholderTextColor="#8A8A8A"
            multiline
            textAlignVertical="top"
            onFocus={() => setOpenLanguageMenu(null)}
            value={topText}
            onChangeText={(text) => {
              lastEdited.current = "top";
              topTextRef.current = text;
              setTopText(text);
              setSubmission(null);
              scheduleTranslation("top", text, targetLanguage, nativeLanguage);
            }}
          />
          <LanguageSelector
            field="targetLanguage"
            languages={targetLanguages}
            selected={targetLanguage}
            open={openLanguageMenu === "targetLanguage"}
            onToggle={() => {
              Keyboard.dismiss();
              setOpenLanguageMenu((current) =>
                current === "targetLanguage" ? null : "targetLanguage"
              );
            }}
            onSelect={(language) => {
              setTargetLanguage(language);
              setOpenLanguageMenu(null);
              if (lastEdited.current === "top") {
                scheduleTranslation("top", topTextRef.current, language, nativeLanguage);
              } else if (lastEdited.current === "bottom") {
                scheduleTranslation("bottom", bottomTextRef.current, nativeLanguage, language);
              }
            }}
          />
        </View>
        <View style={styles.divider}>
          <View style={styles.line} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Submit text"
            accessibilityState={{ disabled: !canSubmit }}
            disabled={!canSubmit}
            onPress={submit}
            style={({ pressed }) => [
              styles.submitButton,
              !canSubmit && styles.disabledButton,
              pressed && styles.pressedButton,
            ]}
          >
            <View pointerEvents="none" style={styles.checkmark} />
          </Pressable>
          <View style={styles.line} />
          {(translating || translationError || submission) && (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.status, translationError && styles.errorStatus]}
            >
              {translating ? "Translating…" : translationError ?? "Submitted"}
            </Text>
          )}
        </View>
        <View style={styles.inputField}>
          <TextInput
            style={styles.input}
            accessibilityLabel="Bottom text"
            placeholder="Tap to enter text"
            placeholderTextColor="#8A8A8A"
            multiline
            textAlignVertical="top"
            onFocus={() => setOpenLanguageMenu(null)}
            value={bottomText}
            onChangeText={(text) => {
              lastEdited.current = "bottom";
              bottomTextRef.current = text;
              setBottomText(text);
              setSubmission(null);
              scheduleTranslation("bottom", text, nativeLanguage, targetLanguage);
            }}
          />
          <LanguageSelector
            field="nativeLanguage"
            languages={nativeLanguages}
            selected={nativeLanguage}
            open={openLanguageMenu === "nativeLanguage"}
            onToggle={() => {
              Keyboard.dismiss();
              setOpenLanguageMenu((current) =>
                current === "nativeLanguage" ? null : "nativeLanguage"
              );
            }}
            onSelect={(language) => {
              setNativeLanguage(language);
              setOpenLanguageMenu(null);
              if (lastEdited.current === "top") {
                scheduleTranslation("top", topTextRef.current, targetLanguage, language);
              } else if (lastEdited.current === "bottom") {
                scheduleTranslation("bottom", bottomTextRef.current, language, targetLanguage);
              }
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  inputField: { flex: 1, minHeight: 0, position: "relative" },
  input: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 56,
    fontSize: 20,
    lineHeight: 28,
    color: "#262626",
  },
  topInput: { paddingTop: 56 },
  languageSelector: {
    position: "absolute",
    right: 28,
    bottom: 20,
    alignItems: "flex-end",
  },
  languageLabel: {
    minWidth: 48,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  pressedLanguageLabel: { backgroundColor: "#DCDCDC" },
  languageLabelText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: "#262626",
  },
  languageMenu: {
    width: 180,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  languageOption: {
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedLanguageOption: { backgroundColor: "#F0F0F0" },
  pressedLanguageOption: { backgroundColor: "#E5E5E5" },
  languageOptionName: { fontSize: 15, color: "#262626" },
  languageOptionCode: { fontSize: 12, fontWeight: "600", color: "#737373" },
  divider: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
  },
  line: { flex: 1, height: 1, backgroundColor: "#DCDCDC" },
  submitButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginHorizontal: 12,
    backgroundColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: { backgroundColor: "#B0B0B0" },
  pressedButton: { backgroundColor: "#525252", transform: [{ scale: 0.95 }] },
  checkmark: {
    width: 12,
    height: 21,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#FFFFFF",
    transform: [{ translateY: -3 }, { rotate: "45deg" }],
  },
  status: {
    position: "absolute",
    top: 70,
    alignSelf: "center",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 12,
    color: "#737373",
  },
  errorStatus: { color: "#B42318" },
});
