import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccountSection } from "./settings";

export default function AccountPage() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <AccountSection onAuthenticated={() => undefined} onSignedOut={() => undefined} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 40 },
});
