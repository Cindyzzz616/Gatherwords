import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LONG_PRESS_DURATION = 600;

const shortcuts = [
  { icon: "speech", label: "Speech bubble", position: { top: 0, left: 112 } },
  { icon: "scanner", label: "Scanner", position: { top: 112, right: 0 } },
  { icon: "soundwave", label: "Soundwave", position: { bottom: 0, left: 112 } },
  { icon: "plus", label: "Add", position: { top: 112, left: 0 } },
] as const;

function ShortcutIcon({ name }: { name: (typeof shortcuts)[number]["icon"] }) {
  if (name === "speech") {
    return (
      <View style={styles.icon}>
        <View style={styles.speechBubble} />
        <View style={styles.speechTail} />
      </View>
    );
  }

  if (name === "scanner") {
    return (
      <View style={styles.icon}>
        <View style={[styles.scanCorner, styles.topLeft]} />
        <View style={[styles.scanCorner, styles.topRight]} />
        <View style={[styles.scanCorner, styles.bottomLeft]} />
        <View style={[styles.scanCorner, styles.bottomRight]} />
        <View style={styles.scanLine} />
      </View>
    );
  }

  if (name === "soundwave") {
    return (
      <View style={[styles.icon, styles.wave]}>
        {[8, 16, 24, 16, 8].map((height, index) => (
          <View key={index} style={[styles.waveBar, { height }]} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.icon}>
      <View style={styles.plusHorizontal} />
      <View style={styles.plusVertical} />
    </View>
  );
}

export default function Index() {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => () => progress.stopAnimation(), [progress]);

  function resetAnimation() {
    progress.stopAnimation();
    progress.setValue(0);
  }

  function startAnimation() {
    resetAnimation();
    Animated.timing(progress, {
      toValue: 1,
      duration: LONG_PRESS_DURATION,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }

  return (
    <View style={styles.container}>
      <View style={styles.buttonGroup}>
        {shortcuts.map(({ icon, label, position }) => (
          <Pressable
            key={icon}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={
              icon === "plus"
                ? () => router.push("/add")
                : icon === "soundwave"
                  ? () => router.push("/listen")
                  : undefined
            }
            style={({ pressed }) => [
              styles.smallButton,
              position,
              pressed && styles.smallButtonPressed,
            ]}
          >
            <View pointerEvents="none" accessible={false}>
              <ShortcutIcon name={icon} />
            </View>
          </Pressable>
        ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Practice page"
        accessibilityHint="Press and hold to open the Practice page."
        delayLongPress={LONG_PRESS_DURATION}
        onPressIn={startAnimation}
        onPressOut={resetAnimation}
        onLongPress={() => {
          progress.stopAnimation();
          progress.setValue(1);
          router.push("/practice");
        }}
        style={styles.button}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.fill, { transform: [{ scale: progress }] }]}
        />
      </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open settings"
        onPress={() => router.push("/settings")}
        style={({ pressed }) => [
          styles.settingsButton,
          { left: insets.left + 16, bottom: insets.bottom + 16 },
          pressed && styles.settingsPressed,
        ]}
      >
        <SymbolView
          name={{ ios: "gearshape", android: "settings", web: "settings" }}
          size={26}
          tintColor="#262626"
          style={styles.settingsIcon}
        />
      </Pressable>
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
    overflow: "hidden",
  },
  settingsButton: {
    position: "absolute",
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsPressed: { opacity: 0.5 },
  settingsIcon: { width: 26, height: 26 },
  buttonGroup: {
    width: 280,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  smallButton: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  smallButtonPressed: {
    backgroundColor: "#DCDCDC",
    transform: [{ scale: 0.94 }],
  },
  icon: { width: 24, height: 24 },
  speechBubble: {
    position: "absolute",
    top: 2,
    left: 1,
    width: 22,
    height: 17,
    borderWidth: 2,
    borderColor: "#262626",
    borderRadius: 6,
  },
  speechTail: {
    position: "absolute",
    left: 6,
    top: 16,
    width: 7,
    height: 6,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#262626",
    backgroundColor: "#F0F0F0",
    transform: [{ skewY: "-35deg" }],
  },
  scanCorner: {
    position: "absolute",
    width: 7,
    height: 7,
    borderColor: "#262626",
  },
  topLeft: { top: 1, left: 1, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 3 },
  topRight: { top: 1, right: 1, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 3 },
  bottomLeft: { bottom: 1, left: 1, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 3 },
  bottomRight: { bottom: 1, right: 1, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 3 },
  scanLine: { position: "absolute", top: 11, left: 4, right: 4, height: 2, backgroundColor: "#262626" },
  wave: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  waveBar: { width: 2, borderRadius: 1, backgroundColor: "#262626" },
  plusHorizontal: { position: "absolute", top: 11, left: 3, width: 18, height: 2, borderRadius: 1, backgroundColor: "#262626" },
  plusVertical: { position: "absolute", top: 3, left: 11, width: 2, height: 18, borderRadius: 1, backgroundColor: "#262626" },
  fill: {
    ...StyleSheet.absoluteFill,
    borderRadius: 60,
    backgroundColor: "#A3A3A3",
  },
});
