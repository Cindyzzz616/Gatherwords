import { router } from "expo-router";
import { Pressable, View, StyleSheet } from "react-native";

export default function Index() {
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Practice page"
        accessibilityHint="Press and hold to open the Practice page."
        delayLongPress={600}
        onLongPress={() => router.push("/practice")}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  button: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#262626",
  },
  buttonPressed: {
    backgroundColor: "#525252",
    transform: [{ scale: 0.95 }],
  },
});
