import { StyleSheet } from "react-native";

export const practiceStyles = StyleSheet.create({
  content: { gap: 16 },
  prompt: { color: "#262626", fontSize: 24, lineHeight: 34, fontWeight: "600" },
  card: { padding: 24, borderRadius: 20, backgroundColor: "#F0F0F0", minHeight: 200, justifyContent: "center", gap: 20 },
  choice: { padding: 18, borderRadius: 14, borderWidth: 2, borderColor: "#F0F0F0", backgroundColor: "#F0F0F0" },
  text: { color: "#262626", fontSize: 18, lineHeight: 26 },
  correct: { borderColor: "#147A3E", backgroundColor: "#EAF5EE" },
  wrong: { borderColor: "#B42318", backgroundColor: "#FDECEC" },
  feedback: { color: "#262626", fontSize: 16, lineHeight: 24 },
  hint: { color: "#525252", fontSize: 14 },
  input: { borderWidth: 1, borderColor: "#A3A3A3", borderRadius: 14, padding: 16, color: "#262626", fontSize: 18 },
});
