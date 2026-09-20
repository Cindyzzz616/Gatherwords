import { Pressable, StyleSheet, Text } from "react-native";

type ContactCardProps = {
  name: string;
  phoneNumber: string;
  onPress?: () => void;
};

export function ContactCard({ name, phoneNumber, onPress }: ContactCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Message ${name}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && onPress && styles.pressed]}
    >
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.phoneNumber}>{phoneNumber}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#F0F0F0",
  },
  name: {
    color: "#262626",
    fontSize: 18,
    fontWeight: "600",
  },
  phoneNumber: {
    marginTop: 4,
    color: "#525252",
    fontSize: 14,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
