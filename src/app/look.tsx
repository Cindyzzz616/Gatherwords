import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ensureUser } from "@/lib/ensureUser";
import { addLookEncounter } from "@/lib/encounters";
import { LANGUAGES, type LanguageCode } from "@/lib/languages";
import { loadUserLanguages } from "@/lib/userLanguages";

const LOOK_LANGUAGE_KEY = "look-language";

type ImageSize = { width: number; height: number };
type OcrBox = { id: string; text: string; left: number; top: number; height: number };

export default function LookPage() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [languageOptions, setLanguageOptions] = useState<LanguageCode[]>(LANGUAGES.map(({ code }) => code));
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("en");
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [pendingImageSize, setPendingImageSize] = useState<ImageSize | null>(null);
  const [ocrBoxes, setOcrBoxes] = useState<OcrBox[]>([]);
  const [selectedBoxIds, setSelectedBoxIds] = useState<string[]>([]);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadLookLanguage() {
      try {
        const [storedLanguage, user] = await Promise.all([
          AsyncStorage.getItem(LOOK_LANGUAGE_KEY),
          ensureUser(),
        ]);
        const userLanguages = await loadUserLanguages(user.uid);
        const options = userLanguages.targetLanguage.length
          ? userLanguages.targetLanguage
          : LANGUAGES.map(({ code }) => code);
        const nextLanguage = options.includes(storedLanguage as LanguageCode)
          ? storedLanguage as LanguageCode
          : options[0];
        if (active && nextLanguage) {
          setLanguageOptions(options);
          setSelectedLanguage(nextLanguage);
        }
      } catch (error) {
        console.error("Failed to load Look language", error);
      }
    }
    void loadLookLanguage();
    return () => { active = false; };
  }, []);

  async function selectLanguage(language: LanguageCode) {
    setSelectedLanguage(language);
    setLanguageMenuOpen(false);
    await AsyncStorage.setItem(LOOK_LANGUAGE_KEY, language);
  }

  const selectedLanguageName = LANGUAGES.find(({ code }) => code === selectedLanguage)?.label ?? selectedLanguage;

  function stageImage(uri: string, size: ImageSize) {
    setPendingImageUri(uri);
    setPendingImageSize(size);
    setOcrBoxes([]);
    setSelectedBoxIds([]);
    setOcrError("");
  }

  async function recognizeText(uri: string, size: ImageSize) {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY;
    if (!apiKey) {
      setOcrError("Add EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY to .env and restart Expo.");
      return;
    }

    setOcrLoading(true);
    try {
      const content = await new File(uri).base64();
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{
            image: { content },
            imageContext: { languageHints: [selectedLanguage] },
            features: [{ type: "TEXT_DETECTION" }],
          }],
        }),
      });
      const data = await response.json() as {
        responses?: Array<{
          error?: { message?: string };
          textAnnotations?: Array<{ description?: string; boundingPoly?: { vertices?: Array<{ x?: number; y?: number }> } }>;
        }>;
      };
      const visionResponse = data.responses?.[0];
      if (!response.ok || visionResponse?.error) {
        throw new Error(visionResponse?.error?.message ?? "Google Cloud Vision could not process this image.");
      }

      const annotations = visionResponse?.textAnnotations?.slice(1) ?? [];
      const boxes = annotations.flatMap((annotation, index) => {
        const text = annotation.description?.trim();
        const vertices = annotation.boundingPoly?.vertices ?? [];
        if (!text || vertices.length === 0) return [];
        const xs = vertices.map((vertex) => vertex.x ?? 0);
        const ys = vertices.map((vertex) => vertex.y ?? 0);
        const left = Math.max(0, Math.min(...xs));
        const top = Math.max(0, Math.min(...ys));
        const bottom = Math.min(size.height, Math.max(...ys));
        return [{
          id: `ocr-${index}`,
          text,
          left: left / size.width,
          top: top / size.height,
          height: Math.max(0.02, (bottom - top) / size.height),
        }];
      });
      setOcrBoxes(boxes);
      if (!boxes.length) setOcrError("No text was detected. Try another image.");
    } catch (error) {
      setOcrError(error instanceof Error ? error.message : "Could not recognize text in this image.");
    } finally {
      setOcrLoading(false);
    }
  }

  useEffect(() => {
    if (pendingImageUri && pendingImageSize) void recognizeText(pendingImageUri, pendingImageSize);
  }, [pendingImageUri, pendingImageSize, selectedLanguage]);

  async function takePhoto() {
    if (!cameraPermission?.granted) {
      await requestCameraPermission();
      return;
    }
    if (!cameraRef.current) {
      Alert.alert("Camera access needed", "Allow camera access to take a photo.");
      return;
    }
    try {
      const result = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (result?.uri) stageImage(result.uri, { width: result.width, height: result.height });
    } catch (error) {
      Alert.alert("Could not take photo", error instanceof Error ? error.message : "Try again.");
    }
  }

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo access needed", "Allow photo access to choose an image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      stageImage(asset.uri, { width: asset.width, height: asset.height });
    }
  }

  const displayedImageUri = pendingImageUri ?? imageUri;
  const hasImage = Boolean(displayedImageUri);

  function discardPhoto() {
    setPendingImageUri(null);
    setImageUri(null);
    setPendingImageSize(null);
    setOcrBoxes([]);
    setSelectedBoxIds([]);
    setOcrError("");
  }

  function toggleBox(id: string) {
    setSelectedBoxIds((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]);
  }

  async function confirmPhoto() {
    const selectedText = ocrBoxes
      .filter((box) => selectedBoxIds.includes(box.id))
      .map((box) => box.text)
      .join(" ")
      .trim();
    if (!selectedText) {
      Alert.alert("Select text first", "Tap one or more detected text boxes before saving.");
      return;
    }

    setSaving(true);
    try {
      const user = await ensureUser();
      await addLookEncounter(user.uid, selectedLanguage, selectedText);
      Alert.alert("Saved", "The selected text was saved as an encounter.");
      setSelectedBoxIds([]);
    } catch (error) {
      Alert.alert("Could not save encounter", error instanceof Error ? error.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (cameraPermission && !cameraPermission.granted) void requestCameraPermission();
  }, [cameraPermission, requestCameraPermission]);

  return (
    <View style={styles.container}>
      <View style={[styles.languageSelector, { top: insets.top + 16, right: 20 }]}>
        {languageMenuOpen && (
          <View style={styles.languageMenu}>
            {languageOptions.map((code) => {
              const language = LANGUAGES.find((item) => item.code === code);
              const isSelected = code === selectedLanguage;
              return (
                <Pressable
                  key={code}
                  accessibilityRole="radio"
                  accessibilityLabel={language?.label ?? code.toUpperCase()}
                  accessibilityState={{ checked: isSelected }}
                  onPress={() => void selectLanguage(code)}
                  style={({ pressed }) => [styles.languageOption, isSelected && styles.selectedLanguageOption, pressed && styles.pressedLanguageOption]}
                >
                  <Text style={styles.languageOptionName}>{language?.label ?? code}</Text>
                  <Text style={styles.languageOptionCode}>{code.toUpperCase()}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Change look language from ${selectedLanguageName}`}
          accessibilityState={{ expanded: languageMenuOpen }}
          onPress={() => setLanguageMenuOpen((open) => !open)}
          style={({ pressed }) => [styles.languageLabel, pressed && styles.pressedLanguageLabel]}
        >
          <Text style={styles.languageLabelText}>{selectedLanguage.toUpperCase()}</Text>
        </Pressable>
      </View>
      <View style={styles.imageArea}>
        <View style={styles.imageFrame}>
          {displayedImageUri ? (
            <Image
              source={{ uri: displayedImageUri }}
              accessibilityLabel="Selected photo"
              resizeMode="contain"
              style={styles.placeholderImage}
            />
          ) : cameraPermission?.granted ? (
            <CameraView ref={cameraRef} facing="back" style={styles.cameraPreview} />
          ) : (
            <Image
              source={require("../../assets/images/placeholder.jpg")}
              accessibilityLabel="Image preview placeholder"
              resizeMode="contain"
              style={styles.placeholderImage}
            />
          )}
          {ocrLoading && (
            <View style={styles.ocrStatus} pointerEvents="none">
              <Text style={styles.ocrStatusText}>Recognizing text...</Text>
            </View>
          )}
          {ocrError ? (
            <View style={styles.ocrStatus} pointerEvents="none">
              <Text style={styles.ocrStatusText}>{ocrError}</Text>
            </View>
          ) : null}
          {ocrBoxes.length > 0 && (
            <View style={styles.ocrOverlay} pointerEvents="box-none">
              {ocrBoxes.map((box) => {
                const selected = selectedBoxIds.includes(box.id);
                return (
                  <Pressable
                    key={box.id}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Select ${box.text}`}
                    accessibilityState={{ checked: selected }}
                    onPress={() => toggleBox(box.id)}
                    style={[
                      styles.ocrBox,
                      {
                        left: `${box.left * 100}%`,
                        top: `${box.top * 100}%`,
                        minHeight: `${box.height * 100}%`,
                        maxWidth: `${Math.min(0.82, 1 - box.left) * 100}%`,
                      },
                      selected && styles.selectedOcrBox,
                    ]}
                  >
                    <Text style={styles.ocrBoxText}>{box.text}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </View>
      <View style={[styles.bottomControls, { bottom: insets.bottom + 24 }]}> 
        {!hasImage ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Take a photo"
              onPress={() => void takePhoto()}
              style={({ pressed }) => [styles.cameraButton, pressed && styles.pressedButton]}
            >
              <SymbolView
                name={{ ios: "camera.fill", android: "camera", web: "camera" }}
                size={28}
                tintColor="#FFFFFF"
                style={styles.cameraIcon}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open photo library"
              onPress={() => void choosePhoto()}
              style={({ pressed }) => [styles.libraryButton, pressed && styles.pressedLibraryButton]}
            >
              <SymbolView
                name={{ ios: "photo.on.rectangle", android: "photo_library", web: "image" }}
                size={26}
                tintColor="#262626"
                style={styles.libraryIcon}
              />
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Discard selected photo"
              onPress={discardPhoto}
              style={({ pressed }) => [styles.discardButton, pressed && styles.pressedLibraryButton]}
            >
              <SymbolView name={{ ios: "xmark", android: "close", web: "close" }} size={26} tintColor="#262626" style={styles.libraryIcon} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirm selected photo"
              accessibilityState={{ disabled: ocrLoading || saving || selectedBoxIds.length === 0 }}
              disabled={ocrLoading || saving || selectedBoxIds.length === 0}
              onPress={confirmPhoto}
              style={({ pressed }) => [styles.confirmButton, pressed && styles.pressedLibraryButton]}
            >
              <SymbolView name={{ ios: "checkmark", android: "check", web: "check" }} size={26} tintColor="#262626" style={styles.libraryIcon} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  imageArea: {
    flex: 1,
    paddingTop: 106,
    paddingBottom: 132,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
  },
  cameraPreview: {
    width: "100%",
    height: "100%",
  },
  imageFrame: {
    position: "relative",
    width: "100%",
    height: "100%",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
  },
  ocrOverlay: {
    ...StyleSheet.absoluteFill,
  },
  ocrBox: {
    position: "absolute",
    minWidth: 48,
    maxWidth: "82%",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#262626",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
  },
  selectedOcrBox: {
    borderWidth: 2,
    borderColor: "#147A3E",
    backgroundColor: "rgba(20, 122, 62, 0.25)",
  },
  ocrBoxText: {
    color: "#262626",
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
  },
  ocrStatus: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  ocrStatusText: {
    color: "#262626",
    fontSize: 16,
    textAlign: "center",
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bottomControls: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraIcon: { width: 28, height: 28 },
  pressedButton: { backgroundColor: "#525252", transform: [{ scale: 0.95 }] },
  libraryButton: {
    position: "absolute",
    right: 24,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  libraryIcon: { width: 26, height: 26 },
  pressedLibraryButton: { opacity: 0.5 },
  discardButton: { position: "absolute", left: 24, width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  confirmButton: { position: "absolute", right: 24, width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  languageSelector: { position: "absolute", alignItems: "flex-end", zIndex: 2 },
  languageLabel: { minWidth: 48, height: 32, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#F0F0F0", alignItems: "center", justifyContent: "center" },
  pressedLanguageLabel: { backgroundColor: "#DCDCDC" },
  languageLabelText: { fontSize: 13, fontWeight: "600", letterSpacing: 0.8, color: "#262626" },
  languageMenu: { position: "absolute", top: 40, right: 0, width: 180, borderWidth: 1, borderColor: "#E5E5E5", borderRadius: 12, backgroundColor: "#FFFFFF", overflow: "hidden", elevation: 4, shadowColor: "#000000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8 },
  languageOption: { minHeight: 44, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selectedLanguageOption: { backgroundColor: "#F0F0F0" },
  pressedLanguageOption: { backgroundColor: "#E5E5E5" },
  languageOptionName: { fontSize: 15, color: "#262626" },
  languageOptionCode: { fontSize: 12, fontWeight: "600", color: "#737373" },
});
