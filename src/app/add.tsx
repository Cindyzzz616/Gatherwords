import { useMemo, useState } from "react";
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

export default function AddPage() {
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [submission, setSubmission] = useState<{
    top: string;
    bottom: string;
  } | null>(null);
  const canSubmit = Boolean(topText.trim() || bottomText.trim());
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
        <TextInput
          style={[styles.input, styles.topInput]}
          accessibilityLabel="Top text"
          placeholder="Tap to enter text"
          placeholderTextColor="#8A8A8A"
          multiline
          textAlignVertical="top"
          value={topText}
          onChangeText={(text) => {
            setTopText(text);
            setSubmission(null);
          }}
        />
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
          {submission && (
            <Text accessibilityLiveRegion="polite" style={styles.status}>
              Submitted
            </Text>
          )}
        </View>
        <TextInput
          style={styles.input}
          accessibilityLabel="Bottom text"
          placeholder="Tap to enter text"
          placeholderTextColor="#8A8A8A"
          multiline
          textAlignVertical="top"
          value={bottomText}
          onChangeText={(text) => {
            setBottomText(text);
            setSubmission(null);
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  input: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 28,
    paddingVertical: 32,
    fontSize: 20,
    lineHeight: 28,
    color: "#262626",
  },
  topInput: { paddingTop: 56 },
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
});
