import { SymbolView } from "expo-symbols";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ContactCard } from "@/components/contact-card";
import { ensureUser } from "@/lib/ensureUser";
import { addUserContact, subscribeToUserContacts, type UserContact } from "@/lib/contacts";

export default function TalkPage() {
  const insets = useSafeAreaInsets();
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState<UserContact[]>([]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void ensureUser().then((user) => {
      if (active) unsubscribe = subscribeToUserContacts(user.uid, setContacts);
    }).catch((error) => console.error("Could not load contacts", error));
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  function closeForm() {
    setFormOpen(false);
    setName("");
    setPhoneNumber("");
  }

  async function saveContact() {
    setSaving(true);
    try {
      const user = await ensureUser();
      await addUserContact(user.uid, name, phoneNumber);
      closeForm();
      Alert.alert("Contact saved", "This person is ready for a conversation.");
    } catch (error) {
      Alert.alert("Could not save contact", error instanceof Error ? error.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.contacts, { paddingTop: insets.top + 24 }]}>
        {contacts.map((contact) => (
          <ContactCard
            key={contact.id}
            name={contact.name}
            phoneNumber={contact.phoneNumber}
            onPress={() => router.push({
              pathname: "/talk/[contactId]",
              params: { contactId: contact.id, name: contact.name, phoneNumber: contact.phoneNumber },
            })}
          />
        ))}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Start a new conversation"
        onPress={() => setFormOpen(true)}
        style={({ pressed }) => [styles.addButton, { bottom: insets.bottom + 24 }, pressed && styles.pressedButton]}
      >
        <SymbolView
          name={{ ios: "plus", android: "add", web: "add" }}
          size={28}
          tintColor="#FFFFFF"
          style={styles.addIcon}
        />
      </Pressable>
      <Modal visible={formOpen} transparent animationType="fade" onRequestClose={closeForm}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New contact</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor="#262626"
              autoCapitalize="words"
              style={styles.input}
            />
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Phone number"
              placeholderTextColor="#262626"
              keyboardType="phone-pad"
              style={styles.input}
            />
            <View style={styles.formActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel adding contact"
                disabled={saving}
                onPress={closeForm}
                style={({ pressed }) => [styles.formIconButton, pressed && styles.iconPressed]}
              >
                <SymbolView name={{ ios: "xmark", android: "close", web: "close" }} size={26} tintColor="#262626" style={styles.formIcon} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save contact"
                accessibilityState={{ disabled: saving }}
                disabled={saving}
                onPress={() => void saveContact()}
                style={({ pressed }) => [styles.formIconButton, pressed && styles.iconPressed]}
              >
                <SymbolView name={{ ios: "checkmark", android: "check", web: "check" }} size={26} tintColor="#262626" style={styles.formIcon} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  contacts: { paddingHorizontal: 24, paddingBottom: 120, gap: 12 },
  addButton: {
    position: "absolute",
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
  },
  addIcon: { width: 28, height: 28 },
  pressedButton: { backgroundColor: "#525252", transform: [{ scale: 0.95 }] },
  modalBackdrop: { flex: 1, justifyContent: "center", paddingHorizontal: 28, backgroundColor: "rgba(0, 0, 0, 0.25)" },
  formCard: { borderRadius: 20, padding: 24, backgroundColor: "#FFFFFF" },
  formTitle: { marginBottom: 20, color: "#262626", fontSize: 22, fontWeight: "600" },
  input: { minHeight: 48, marginBottom: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: "#D4D4D4", borderRadius: 12, color: "#262626", fontSize: 16 },
  formActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  formIconButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  formIcon: { width: 26, height: 26 },
  iconPressed: { opacity: 0.5 },
});
