import { Pressable, Text } from "react-native";
import type { PracticeActivity } from "@/lib/practice";
import { practiceStyles as styles } from "./practice-styles";

export function Flashcard({ activity, revealed, onReveal }: {
  activity: PracticeActivity; revealed: boolean; onReveal: () => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Reveal flashcard answer"
    onPress={onReveal} style={styles.card}>
    <Text style={styles.prompt}>{activity.prompt}</Text>
    {revealed ? <>
      <Text style={styles.text}>{activity.answer}</Text>
      <Text style={styles.feedback}>{activity.explanation}</Text>
    </> : <Text style={styles.hint}>Tap to reveal</Text>}
  </Pressable>;
}
