import { Pressable, Text, View } from "react-native";
import type { PracticeActivity } from "@/lib/practice";
import { practiceStyles as styles } from "./practice-styles";

export function Mcq({ activity, answer, revealed, onAnswer }: {
  activity: PracticeActivity; answer: string | null; revealed: boolean; onAnswer: (answer: string) => void;
}) {
  return <View style={styles.content}>
    <Text style={styles.prompt}>{activity.prompt}</Text>
    {activity.choices.map((choice, index) => <Pressable key={choice}
      accessibilityRole="button" accessibilityLabel={`${index + 1}. ${choice}`}
      disabled={revealed} onPress={() => onAnswer(choice)}
      style={[styles.choice, revealed && choice === activity.answer && styles.correct,
        revealed && answer === choice && choice !== activity.answer && styles.wrong]}>
      <Text style={styles.text}>{choice}</Text>
    </Pressable>)}
    {revealed && <Text accessibilityLiveRegion="polite" style={styles.feedback}>
      {answer === activity.answer ? "Correct!" : `Answer: ${activity.answer}`} {activity.explanation}
    </Text>}
  </View>;
}
