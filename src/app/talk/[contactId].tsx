import { SymbolView } from "expo-symbols";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { saveContactChatId } from "@/lib/contacts";
import { ensureUser } from "@/lib/ensureUser";
import { saveOutgoingMessage, sendLinqMessage, subscribeToContactMessages, type ConversationMessage } from "@/lib/messages";

export default function ConversationPage() {
  const insets = useSafeAreaInsets();
  const { contactId, name, phoneNumber } = useLocalSearchParams<{ contactId: string; name: string; phoneNumber: string }>();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const chatId = useRef<string | undefined>();
  const scrollView = useRef<ScrollView>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    void ensureUser().then((user) => {
      unsubscribe = subscribeToContactMessages(user.uid, contactId, setMessages);
    }).catch((error) => console.error("Could not load messages", error));
    return () => unsubscribe?.();
  }, [contactId]);

  async function sendMessage() {
    const message = text.trim();
    if (!message || sending) return;

    setSending(true);
    try {
      const user = await ensureUser();
      const result = await sendLinqMessage({ phoneNumber, text: message, chatId: chatId.current });
      if (result.chatId && result.chatId !== chatId.current) {
        chatId.current = result.chatId;
        await saveContactChatId(user.uid, contactId, result.chatId);
      }
      await saveOutgoingMessage(user.uid, contactId, message, result.messageId);
      setText("");
    } catch (error) {
      Alert.alert("Message not sent", error instanceof Error ? error.message : "Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container} keyboardVerticalOffset={insets.top}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to contacts" onPress={() => router.back()} style={styles.backButton}>
          <SymbolView name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }} size={22} tintColor="#262626" style={styles.backIcon} />
        </Pressable>
        <View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.phoneNumber}>{phoneNumber}</Text>
        </View>
      </View>
      <ScrollView
        ref={scrollView}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => scrollView.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? <Text style={styles.empty}>Start a conversation with {name}.</Text> : null}
        {messages.map((message) => (
          <View key={message.id} style={[styles.bubble, message.direction === "outbound" ? styles.outbound : styles.inbound]}>
            <Text style={[styles.messageText, message.direction === "outbound" && styles.outboundText]}>{message.text}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message"
          placeholderTextColor="#737373"
          multiline
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !text.trim() || sending }}
          disabled={!text.trim() || sending}
          onPress={() => void sendMessage()}
          style={({ pressed }) => [styles.sendButton, (!text.trim() || sending) && styles.sendButtonDisabled, pressed && styles.sendButtonPressed]}
        >
          <SymbolView name={{ ios: "arrow.up", android: "send", web: "send" }} size={20} tintColor="#FFFFFF" style={styles.sendIcon} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#E5E5E5" },
  backButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  backIcon: { width: 22, height: 22 },
  name: { color: "#262626", fontSize: 18, fontWeight: "700" },
  phoneNumber: { marginTop: 2, color: "#737373", fontSize: 13 },
  messages: { flexGrow: 1, padding: 16, gap: 8, justifyContent: "flex-end" },
  empty: { alignSelf: "center", marginBottom: 24, color: "#737373", fontSize: 14 },
  bubble: { maxWidth: "80%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  inbound: { alignSelf: "flex-start", backgroundColor: "#F0F0F0" },
  outbound: { alignSelf: "flex-end", backgroundColor: "#262626" },
  messageText: { color: "#262626", fontSize: 16, lineHeight: 21 },
  outboundText: { color: "#FFFFFF" },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E5E5E5" },
  input: { flex: 1, maxHeight: 112, minHeight: 46, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 23, backgroundColor: "#F0F0F0", color: "#262626", fontSize: 16 },
  sendButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "#262626" },
  sendButtonDisabled: { backgroundColor: "#A3A3A3" },
  sendButtonPressed: { transform: [{ scale: 0.95 }] },
  sendIcon: { width: 20, height: 20 },
});
