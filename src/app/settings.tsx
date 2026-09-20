import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { onAuthStateChanged, type User } from "firebase/auth";

import { auth } from "@/lib/firebaseAuth";
import { loadUsername, logInWithEmail, logOut, signInWithGoogle, signUpWithEmail } from "@/lib/account";
import { ensureUser } from "@/lib/ensureUser";
import { LANGUAGES, type LanguageCode, type LanguageField, type UserLanguages } from "@/lib/languages";
import { loadUserLanguages, saveUserLanguages } from "@/lib/userLanguages";

const GROUPS = [
  { key: "nativeLanguage", label: "I speak..." },
  { key: "targetLanguage", label: "I want to learn..." },
] as const;

function AccountSection({
  onAuthenticated,
  onSignedOut,
}: {
  onAuthenticated: (userId: string) => void;
  onSignedOut: () => void;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [mode, setMode] = useState<"signup" | "login" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      if (nextUser && !nextUser.isAnonymous) {
        void loadUsername(nextUser.uid).then(setUsername).catch(() => setUsername(null));
      } else {
        setUsername(null);
      }
    });
    return unsubscribe;
  }, []);

  async function submitEmailAccount() {
    if (!email.trim() || !password) {
      setAccountError("Enter your email and password.");
      return;
    }
    if (mode === "signup" && !signupUsername.trim()) {
      setAccountError("Choose a username to sign up.");
      return;
    }
    setBusy(true);
    setAccountError(null);
    try {
      const nextUser = mode === "signup"
        ? await signUpWithEmail(email, password, signupUsername)
        : await logInWithEmail(email, password);
      if (mode === "login") setUsername(await loadUsername(nextUser.uid));
      onAuthenticated(nextUser.uid);
      setMode(null);
      setEmail("");
      setPassword("");
      setSignupUsername("");
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "Couldn’t complete authentication.");
    } finally {
      setBusy(false);
    }
  }

  async function useGoogle() {
    if (mode === "signup" && !signupUsername.trim()) {
      setAccountError("Choose a username to sign up with Google.");
      return;
    }
    setBusy(true);
    setAccountError(null);
    try {
      const nextUser = await signInWithGoogle(mode === "signup" ? signupUsername : undefined);
      setUsername(await loadUsername(nextUser.uid));
      onAuthenticated(nextUser.uid);
      setMode(null);
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "Couldn’t complete Google sign-in.");
    } finally {
      setBusy(false);
    }
  }

  async function signOutAccount() {
    setBusy(true);
    try {
      await logOut();
      onSignedOut();
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "Couldn’t log out.");
    } finally {
      setBusy(false);
    }
  }

  if (user && !user.isAnonymous) {
    return (
      <View style={styles.accountSection}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Text style={styles.username}>{username ?? user.displayName ?? user.email ?? "Signed in"}</Text>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void signOutAccount()} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Log out</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.accountSection}>
      <Text style={styles.sectionTitle}>Account</Text>
      {mode === null ? (
        <View style={styles.accountActions}>
          <Pressable accessibilityRole="button" onPress={() => setMode("signup")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Sign up</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setMode("login")} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Log in</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.formTitle}>{mode === "signup" ? "Create an account" : "Log in"}</Text>
          {mode === "signup" && (
            <TextInput style={styles.accountInput} placeholder="Username" value={signupUsername} onChangeText={setSignupUsername} autoCapitalize="none" />
          )}
          <TextInput style={styles.accountInput} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <TextInput style={styles.accountInput} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void submitEmailAccount()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{mode === "signup" ? "Sign up with email" : "Log in with email"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void useGoogle()} style={styles.googleButton}>
            <Text style={styles.googleButtonText}>{mode === "signup" ? "Sign up with Google" : "Log in with Google"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setMode(null); setAccountError(null); }} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          {accountError && <Text accessibilityRole="alert" style={styles.error}>{accountError}</Text>}
        </View>
      )}
    </View>
  );
}

function firebaseErrorMessage(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "unknown";

  if (["auth/admin-restricted-operation", "auth/configuration-not-found", "auth/operation-not-allowed"].includes(code)) {
    return "Anonymous sign-in isn’t enabled. Enable it in Firebase Authentication, then try again.";
  }
  if (code === "permission-denied" || code === "firestore/permission-denied") {
    return "Firestore denied access. Publish the project’s firestore.rules, then try again.";
  }
  if (code === "failed-precondition" || code === "firestore/failed-precondition" || code === "not-found") {
    return "Cloud Firestore isn’t ready. Create the Firestore database, publish its rules, then try again.";
  }
  if (code === "auth/network-request-failed" || code === "unavailable" || code === "firestore/unavailable") {
    return "Firebase couldn’t connect. Check your internet connection, then try again.";
  }
  return `Couldn’t load your languages. Firebase error: ${code}.`;
}

export default function SettingsPage() {
  const [openMenu, setOpenMenu] = useState<LanguageField | null>(null);
  const [selected, setSelected] = useState<UserLanguages>({
    nativeLanguage: [],
    targetLanguage: [],
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const writeInProgress = useRef(false);
  const disabled = loading || saving || !userId;

  async function handleAuthenticated(nextUserId: string) {
    setUserId(nextUserId);
    try {
      setSelected(await loadUserLanguages(nextUserId));
    } catch (loadError) {
      console.error("Failed to load languages after authentication", loadError);
      setError(firebaseErrorMessage(loadError));
    }
  }

  function handleSignedOut() {
    setUserId(null);
    setSelected({ nativeLanguage: [], targetLanguage: [] });
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setUserId(null);
    async function load() {
      try {
        const user = await ensureUser();
        if (!active) return;
        setUserId(user.uid);
        const languages = await loadUserLanguages(user.uid);
        if (active) {
          setSelected(languages);
        }
      } catch (loadError) {
        console.error("Failed to load Firebase languages", loadError);
        if (active) setError(firebaseErrorMessage(loadError));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [retry]);

  async function changeLanguages(field: LanguageField, languages: LanguageCode[]) {
    if (!userId || loading || writeInProgress.current) return;
    writeInProgress.current = true;
    setSaving(true);
    setError(null);
    try {
      await saveUserLanguages(userId, field, languages);
      setSelected((current) => ({ ...current, [field]: languages }));
    } catch (saveError) {
      console.error("Failed to save Firebase languages", saveError);
      setError(firebaseErrorMessage(saveError).replace("load", "save"));
    } finally {
      writeInProgress.current = false;
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {(loading || saving) && (
          <Text accessibilityLiveRegion="polite" style={styles.status}>
            {loading ? "Loading languages…" : "Saving…"}
          </Text>
        )}
        {error && (
          <View style={styles.message}>
            <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => setRetry((value) => value + 1)} style={styles.retryButton}>
              <Text style={styles.chipText}>Retry</Text>
            </Pressable>
          </View>
        )}
        {GROUPS.map(({ key, label }) => (
          <View key={key} style={styles.group}>
            <View style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${openMenu === key ? "Close" : "Choose"} languages: ${label}`}
                accessibilityState={{ expanded: openMenu === key, disabled }}
                disabled={disabled}
                onPress={() => setOpenMenu(openMenu === key ? null : key)}
                style={({ pressed }) => [styles.addButton, (pressed || disabled) && styles.pressed]}
              >
                <View pointerEvents="none" style={styles.plus}>
                  <View style={styles.plusHorizontal} />
                  {openMenu !== key && <View style={styles.plusVertical} />}
                </View>
              </Pressable>
            </View>
            {selected[key].length > 0 && (
              <View style={styles.selectedLanguages}>
                {LANGUAGES.filter((language) => selected[key].includes(language.code)).map((language) => (
                  <View key={language.code} style={styles.chip}>
                    <Text style={styles.chipText}>{language.label}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${language.label} from ${label}`}
                      accessibilityState={{ disabled }}
                      disabled={disabled}
                      onPress={() => void changeLanguages(
                        key,
                        selected[key].filter((code) => code !== language.code),
                      )}
                      style={({ pressed }) => [styles.removeButton, (pressed || disabled) && styles.pressed]}
                    >
                      <View pointerEvents="none" style={styles.removeIcon}>
                        <View style={[styles.removeStroke, styles.removeStrokeForward]} />
                        <View style={[styles.removeStroke, styles.removeStrokeBackward]} />
                      </View>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            {openMenu === key && (
              <View style={styles.menu}>
                {LANGUAGES.map((language) => {
                  const isSelected = selected[key].includes(language.code);
                  return (
                    <Pressable
                      key={language.code}
                      accessibilityRole="checkbox"
                      accessibilityLabel={language.label}
                      accessibilityState={{ checked: isSelected, disabled }}
                      disabled={disabled}
                      onPress={() => {
                        const nextLanguages = isSelected
                          ? selected[key].filter((code) => code !== language.code)
                          : [...selected[key], language.code];
                        void changeLanguages(key, nextLanguages);
                      }}
                      style={({ pressed }) => [
                        styles.option,
                        isSelected && styles.selectedOption,
                        pressed && styles.pressedOption,
                      ]}
                    >
                      <Text style={styles.optionText}>{language.label}</Text>
                      {isSelected && <View style={styles.checkmark} />}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ))}
        <AccountSection
          onAuthenticated={(nextUserId) => void handleAuthenticated(nextUserId)}
          onSignedOut={handleSignedOut}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: { paddingHorizontal: 28, paddingTop: 40, paddingBottom: 32 },
  status: { marginBottom: 16, color: "#737373", fontSize: 14 },
  message: { marginBottom: 16 },
  error: { color: "#B42318", fontSize: 14, lineHeight: 20 },
  retryButton: { alignSelf: "flex-start", paddingVertical: 14, paddingRight: 20 },
  accountSection: { marginBottom: 44 },
  sectionTitle: { marginBottom: 12, fontSize: 14, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase", color: "#737373" },
  username: { marginBottom: 16, fontSize: 24, fontWeight: "600", color: "#262626" },
  accountActions: { flexDirection: "row", gap: 12 },
  form: { gap: 12 },
  formTitle: { marginBottom: 4, fontSize: 22, fontWeight: "500", color: "#262626" },
  accountInput: { minHeight: 48, paddingHorizontal: 14, borderWidth: 1, borderColor: "#DCDCDC", borderRadius: 12, fontSize: 16, color: "#262626" },
  primaryButton: { minHeight: 46, paddingHorizontal: 18, borderRadius: 12, backgroundColor: "#262626", alignItems: "center", justifyContent: "center" },
  primaryButtonText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  secondaryButton: { minHeight: 46, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: "#DCDCDC", alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { fontSize: 15, fontWeight: "600", color: "#262626" },
  googleButton: { minHeight: 46, paddingHorizontal: 18, borderRadius: 12, backgroundColor: "#4285F4", alignItems: "center", justifyContent: "center" },
  googleButtonText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  cancelButton: { alignSelf: "flex-start", paddingVertical: 8 },
  cancelText: { fontSize: 15, color: "#737373" },
  group: { marginBottom: 32 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  label: { flexShrink: 1, fontSize: 22, fontWeight: "500", color: "#262626" },
  addButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.5 },
  plus: { width: 24, height: 24 },
  plusHorizontal: { position: "absolute", top: 11, left: 3, width: 18, height: 2, borderRadius: 1, backgroundColor: "#262626" },
  plusVertical: { position: "absolute", top: 3, left: 11, width: 2, height: 18, borderRadius: 1, backgroundColor: "#262626" },
  selectedLanguages: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: { flexDirection: "row", alignItems: "center", backgroundColor: "#F0F0F0", paddingLeft: 14, borderRadius: 22 },
  chipText: { fontSize: 15, color: "#262626" },
  removeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  removeIcon: { width: 16, height: 16 },
  removeStroke: { position: "absolute", left: 1, top: 7, width: 14, height: 2, borderRadius: 1, backgroundColor: "#262626" },
  removeStrokeForward: { transform: [{ rotate: "45deg" }] },
  removeStrokeBackward: { transform: [{ rotate: "-45deg" }] },
  menu: { marginTop: 12, borderWidth: 1, borderColor: "#E5E5E5", borderRadius: 14, overflow: "hidden" },
  option: { minHeight: 48, paddingHorizontal: 18, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  optionText: { fontSize: 17, color: "#262626" },
  selectedOption: { backgroundColor: "#F5F5F5" },
  pressedOption: { backgroundColor: "#E5E5E5" },
  checkmark: { width: 8, height: 14, marginRight: 4, borderRightWidth: 2, borderBottomWidth: 2, borderColor: "#262626", transform: [{ rotate: "45deg" }] },
});
