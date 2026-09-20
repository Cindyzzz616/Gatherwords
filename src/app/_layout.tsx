import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="practice" options={{ title: "Practice page" }} />
      <Stack.Screen name="add" options={{ title: "Add" }} />
    </Stack>
  );
}
