import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { PracticeActivity } from "@/lib/practice";
import { practiceStyles as styles } from "./practice-styles";

export function FillInTheBlank({ activity, revealed, onAnswer }: {
  activity: PracticeActivity; revealed: boolean; onAnswer: (answer: string) => void;
}) {
  const [text, setText] = useState("");
  const correct = text.trim().normalize("NFC").toLocaleLowerCase() === activity.answer.trim().normalize("NFC").toLocaleLowerCase();
  return <View style={styles.content}>
    <Text style={styles.prompt}>{activity.prompt}</Text>
    <TextInput accessibilityLabel="Missing word or phrase" placeholder="Your answer" placeholderTextColor="#525252"
      value={text} onChangeText={setText} editable={!revealed} autoCorrect={false}
      style={styles.input} onSubmitEditing={() => { if (text.trim()) onAnswer(text); }} />
    {!revealed && <Pressable accessibilityRole="button" disabled={!text.trim()}
      onPress={() => onAnswer(text)} style={styles.choice}><Text style={styles.text}>Check answer</Text></Pressable>}
    {revealed && <Text style={styles.feedback}>{correct ? "Correct! " : ""}Answer: {activity.answer}. {activity.explanation}</Text>}
  </View>;
}
