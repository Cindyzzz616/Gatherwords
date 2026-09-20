import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ensureUser } from "@/lib/ensureUser";
import { LANGUAGES, type LanguageCode, type LanguageField, type UserLanguages } from "@/lib/languages";
import { loadUserLanguages, saveUserLanguages } from "@/lib/userLanguages";

const GROUPS = [
  { key: "nativeLanguage", label: "I speak..." },
  { key: "targetLanguage", label: "I want to learn..." },
] as const;

function firebaseErrorMessage(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "unknown";

  if (["auth/admin-restricted-operation", "auth/configuration-not-found", "auth/operation-not-allowed"].includes(code)) {
    return "Anonymous sign-in isn’t enabled. Enable it in Firebase Authentication, then try again.";
  }
  if (code === "permission-denied" || code === "firestore/permission-denied") {
    return "Firestore denied access. Publish the project’s firestore.rules, then try again.";
  }
  if (code === "failed-precondition" || code === "firestore/failed-precondition" || code === "not-found") {
    return "Cloud Firestore isn’t ready. Create the Firestore database, publish its rules, then try again.";
  }
  if (code === "auth/network-request-failed" || code === "unavailable" || code === "firestore/unavailable") {
    return "Firebase couldn’t connect. Check your internet connection, then try again.";
  }
  return `Couldn’t load your languages. Firebase error: ${code}.`;
}

export default function SettingsPage() {
  const [openMenu, setOpenMenu] = useState<LanguageField | null>(null);
  const [selected, setSelected] = useState<UserLanguages>({
    nativeLanguage: [],
    targetLanguage: [],
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const writeInProgress = useRef(false);
  const disabled = loading || saving || !userId;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setUserId(null);
    async function load() {
      try {
        const user = await ensureUser();
        if (!active) return;
        setUserId(user.uid);
        const languages = await loadUserLanguages(user.uid);
        if (active) {
          setSelected(languages);
        }
      } catch (loadError) {
        console.error("Failed to load Firebase languages", loadError);
        if (active) setError(firebaseErrorMessage(loadError));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [retry]);

  async function changeLanguages(field: LanguageField, languages: LanguageCode[]) {
    if (!userId || loading || writeInProgress.current) return;
    writeInProgress.current = true;
    setSaving(true);
    setError(null);
    try {
      await saveUserLanguages(userId, field, languages);
      setSelected((current) => ({ ...current, [field]: languages }));
    } catch (saveError) {
      console.error("Failed to save Firebase languages", saveError);
      setError(firebaseErrorMessage(saveError).replace("load", "save"));
    } finally {
      writeInProgress.current = false;
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {(loading || saving) && (
          <Text accessibilityLiveRegion="polite" style={styles.status}>
            {loading ? "Loading languages…" : "Saving…"}
          </Text>
        )}
        {error && (
          <View style={styles.message}>
            <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => setRetry((value) => value + 1)} style={styles.retryButton}>
              <Text style={styles.chipText}>Retry</Text>
            </Pressable>
          </View>
        )}
        {GROUPS.map(({ key, label }) => (
          <View key={key} style={styles.group}>
            <View style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Choose languages: ${label}`}
                accessibilityState={{ expanded: openMenu === key, disabled }}
                disabled={disabled}
                onPress={() => setOpenMenu(openMenu === key ? null : key)}
                style={({ pressed }) => [styles.addButton, (pressed || disabled) && styles.pressed]}
              >
                <View pointerEvents="none" style={styles.plus}>
                  <View style={styles.plusHorizontal} />
                  <View style={styles.plusVertical} />
                </View>
              </Pressable>
            </View>
            {selected[key].length > 0 && (
              <View style={styles.selectedLanguages}>
                {LANGUAGES.filter((language) => selected[key].includes(language.code)).map((language) => (
                  <View key={language.code} style={styles.chip}>
                    <Text style={styles.chipText}>{language.label}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${language.label} from ${label}`}
                      accessibilityState={{ disabled }}
                      disabled={disabled}
                      onPress={() => void changeLanguages(
                        key,
                        selected[key].filter((code) => code !== language.code),
                      )}
                      style={({ pressed }) => [styles.removeButton, (pressed || disabled) && styles.pressed]}
                    >
                      <View pointerEvents="none" style={styles.removeIcon}>
                        <View style={[styles.removeStroke, styles.removeStrokeForward]} />
                        <View style={[styles.removeStroke, styles.removeStrokeBackward]} />
                      </View>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            {openMenu === key && (
              <View style={styles.menu}>
                {LANGUAGES.map((language) => {
                  const isSelected = selected[key].includes(language.code);
                  return (
                    <Pressable
                      key={language.code}
                      accessibilityRole="checkbox"
                      accessibilityLabel={language.label}
                      accessibilityState={{ checked: isSelected, disabled }}
                      disabled={disabled}
                      onPress={() => {
                        const nextLanguages = isSelected
                          ? selected[key].filter((code) => code !== language.code)
                          : [...selected[key], language.code];
                        void changeLanguages(key, nextLanguages);
                      }}
                      style={({ pressed }) => [
                        styles.option,
                        isSelected && styles.selectedOption,
                        pressed && styles.pressedOption,
                      ]}
                    >
                      <Text style={styles.optionText}>{language.label}</Text>
                      {isSelected && <View style={styles.checkmark} />}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: { paddingHorizontal: 28, paddingTop: 40, paddingBottom: 32 },
  status: { marginBottom: 16, color: "#737373", fontSize: 14 },
  message: { marginBottom: 16 },
  error: { color: "#B42318", fontSize: 14, lineHeight: 20 },
  retryButton: { alignSelf: "flex-start", paddingVertical: 14, paddingRight: 20 },
  group: { marginBottom: 32 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  label: { flexShrink: 1, fontSize: 22, fontWeight: "500", color: "#262626" },
  addButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.5 },
  plus: { width: 24, height: 24 },
  plusHorizontal: { position: "absolute", top: 11, left: 3, width: 18, height: 2, borderRadius: 1, backgroundColor: "#262626" },
  plusVertical: { position: "absolute", top: 3, left: 11, width: 2, height: 18, borderRadius: 1, backgroundColor: "#262626" },
  selectedLanguages: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: { flexDirection: "row", alignItems: "center", backgroundColor: "#F0F0F0", paddingLeft: 14, borderRadius: 22 },
  chipText: { fontSize: 15, color: "#262626" },
  removeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  removeIcon: { width: 16, height: 16 },
  removeStroke: { position: "absolute", left: 1, top: 7, width: 14, height: 2, borderRadius: 1, backgroundColor: "#262626" },
  removeStrokeForward: { transform: [{ rotate: "45deg" }] },
  removeStrokeBackward: { transform: [{ rotate: "-45deg" }] },
  menu: { marginTop: 12, borderWidth: 1, borderColor: "#E5E5E5", borderRadius: 14, overflow: "hidden" },
  option: { minHeight: 48, paddingHorizontal: 18, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  optionText: { fontSize: 17, color: "#262626" },
  selectedOption: { backgroundColor: "#F5F5F5" },
  pressedOption: { backgroundColor: "#E5E5E5" },
  checkmark: { width: 8, height: 14, marginRight: 4, borderRightWidth: 2, borderBottomWidth: 2, borderColor: "#262626", transform: [{ rotate: "45deg" }] },
});
