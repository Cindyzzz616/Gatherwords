import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="practice" options={{ title: "Practice page" }} />
      <Stack.Screen name="add" options={{ title: "Add" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="account" options={{ title: "Account" }} />
      <Stack.Screen name="listen" options={{ title: "Listen" }} />
      <Stack.Screen name="look" options={{ title: "Look" }} />
      <Stack.Screen name="talk" options={{ title: "Talk" }} />
      <Stack.Screen name="talk/[contactId]" options={{ title: "Conversation" }} />
    </Stack>
  );
}
