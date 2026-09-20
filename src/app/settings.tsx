import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const LANGUAGES = [
  "English",
  "French",
  "Spanish",
  "Mandarin",
  "Punjabi",
  "Hindi",
  "Arabic",
] as const;

type Language = (typeof LANGUAGES)[number];
type LanguageGroup = "speak" | "learn";

const GROUPS = [
  { key: "speak", label: "I speak..." },
  { key: "learn", label: "I want to learn" },
] as const;

export default function SettingsPage() {
  const [openMenu, setOpenMenu] = useState<LanguageGroup | null>(null);
  const [selected, setSelected] = useState<Record<LanguageGroup, Language[]>>({
    speak: [],
    learn: [],
  });

  function toggleLanguage(group: LanguageGroup, language: Language) {
    setSelected((current) => ({
      ...current,
      [group]: current[group].includes(language)
        ? current[group].filter((item) => item !== language)
        : [...current[group], language],
    }));
    setOpenMenu(null);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {GROUPS.map(({ key, label }) => (
          <View key={key} style={styles.group}>
            <View style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Choose languages: ${label}`}
                accessibilityState={{ expanded: openMenu === key }}
                onPress={() => setOpenMenu(openMenu === key ? null : key)}
                style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
              >
                <View pointerEvents="none" style={styles.plus}>
                  <View style={styles.plusHorizontal} />
                  <View style={styles.plusVertical} />
                </View>
              </Pressable>
            </View>
            {selected[key].length > 0 && (
              <View style={styles.selectedLanguages}>
                {selected[key].map((language) => (
                  <View key={language} style={styles.chip}>
                    <Text style={styles.chipText}>{language}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${language} from ${label}`}
                      onPress={() => setSelected((current) => ({
                        ...current,
                        [key]: current[key].filter((item) => item !== language),
                      }))}
                      style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
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
                  const isSelected = selected[key].includes(language);
                  return (
                    <Pressable
                      key={language}
                      accessibilityRole="checkbox"
                      accessibilityLabel={language}
                      accessibilityState={{ checked: isSelected }}
                      onPress={() => toggleLanguage(key, language)}
                      style={({ pressed }) => [
                        styles.option,
                        isSelected && styles.selectedOption,
                        pressed && styles.pressedOption,
                      ]}
                    >
                      <Text style={styles.optionText}>{language}</Text>
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
