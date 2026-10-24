import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { MobileApi } from "@/services/api";
import { CustomerFeedItem } from "@/types/cm.types";
import { getFriendlyErrorMessage } from "@/utils/error-handler";
import { optimizeImageBelow1MB } from "@/utils/image-optimizer";

interface UpdatePhotosModalProps {
  visible: boolean;
  customer: CustomerFeedItem | null;
  onClose: () => void;
  onSuccess: (updatedData?: any) => void;
}

interface SelectedPhoto {
  uri: string;
  name: string;
  type: string;
  sizeFormatted?: string;
}

export const UpdatePhotosModal = React.memo(function UpdatePhotosModal({
  visible,
  customer,
  onClose,
  onSuccess,
}: UpdatePhotosModalProps) {
  const [customerPhoto, setCustomerPhoto] = useState<SelectedPhoto | null>(
    null,
  );
  const [idProofPhoto, setIdProofPhoto] = useState<SelectedPhoto | null>(null);
  const [optimizingTarget, setOptimizingTarget] = useState<
    "customer" | "idProof" | null
  >(null);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset local state when modal closes or opens with new customer
  React.useEffect(() => {
    if (visible) {
      setCustomerPhoto(null);
      setIdProofPhoto(null);
      setOptimizingTarget(null);
      setErrorMessage(null);
      setUploading(false);
    }
  }, [visible, customer?.customerId]);

  if (!customer) return null;

  const currentPhotoUploaded = Boolean(customer.customerPhoto);
  const currentIdProofUploaded = Boolean(customer.idProofPhoto);

  const handlePickPhoto = async (
    target: "customer" | "idProof",
    source: "camera" | "gallery",
  ) => {
    try {
      setErrorMessage(null);

      let result: ImagePicker.ImagePickerResult;

      if (source === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Camera access is required to take photos. Please enable permissions in device settings.",
          );
          return;
        }

        // allowsEditing: false bypasses the problematic native OS cropper with no proceed buttons
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 0.9,
        });
      } else {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Media library access is required to choose photos from your device.",
          );
          return;
        }

        // allowsEditing: false bypasses the problematic native OS cropper with no proceed buttons
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 0.9,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const defaultName =
          asset.fileName ||
          asset.uri.split("/").pop() ||
          `${target}_${Date.now()}.jpg`;

        setOptimizingTarget(target);
        try {
          // Auto-optimize to strictly under 1MB with high sharpness
          const optimized = await optimizeImageBelow1MB(asset.uri, defaultName);
          const photoObj: SelectedPhoto = {
            uri: optimized.uri,
            name: optimized.name,
            type: optimized.type,
            sizeFormatted: optimized.sizeFormatted,
          };

          if (target === "customer") {
            setCustomerPhoto(photoObj);
          } else {
            setIdProofPhoto(photoObj);
          }
        } finally {
          setOptimizingTarget(null);
        }
      }
    } catch (err: any) {
      setErrorMessage(
        getFriendlyErrorMessage(
          err,
          "Unable to select photo. Please try again.",
        ),
      );
    }
  };

  const handleUpload = async () => {
    if (!customerPhoto && !idProofPhoto) {
      setErrorMessage(
        "Please select at least one photo (Customer Photo or ID Proof) to upload.",
      );
      return;
    }

    setUploading(true);
    setErrorMessage(null);

    try {
      const res = await MobileApi.updateCustomerPhotos(customer.customerId, {
        customerPhoto: customerPhoto || undefined,
        idProofPhoto: idProofPhoto || undefined,
      });

      if (res && res.success) {
        Alert.alert(
          "Photos Uploaded",
          "Customer KYC photos have been updated successfully.",
          [
            {
              text: "OK",
              onPress: () => {
                onSuccess(res.data);
                onClose();
              },
            },
          ],
        );
      } else {
        setErrorMessage(
          res?.message || "Failed to update customer photos. Please try again.",
        );
      }
    } catch (err: any) {
      const msg = getFriendlyErrorMessage(
        err,
        "Failed to upload photos. Please check your network and try again.",
      );
      setErrorMessage(msg);
    } finally {
      setUploading(false);
    }
  };

  const canSubmit =
    Boolean(customerPhoto || idProofPhoto) && !uploading && !optimizingTarget;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={styles.safeArea}
        edges={["top", "bottom", "left", "right"]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerBadge}>CUSTOMER KYC</Text>
            <Text
              variant="titleLarge"
              style={styles.customerName}
              numberOfLines={1}
            >
              {customer.customerName}
            </Text>
            <Text style={styles.customerIdText}>
              ID: {customer.customerId} • 📞 {customer.mobile || "N/A"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            disabled={uploading || Boolean(optimizingTarget)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          ) : null}

          {/* Section 1: Customer Portrait Photo */}
          <View style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name="account-box"
                  size={22}
                  color="#00A859"
                />
              </View>
              <View style={styles.cardTitleWrap}>
                <Text style={styles.sectionTitle}>1. Customer Photo</Text>
                <Text style={styles.sectionSubtitle}>
                  Clear passport-style photo of the customer
                </Text>
              </View>
              {currentPhotoUploaded ? (
                <View style={styles.badgeDone}>
                  <Text style={styles.badgeDoneText}>✅ On File</Text>
                </View>
              ) : (
                <View style={styles.badgePending}>
                  <Text style={styles.badgePendingText}>⚠️ Missing</Text>
                </View>
              )}
            </View>

            {optimizingTarget === "customer" ? (
              <View style={styles.optimizingContainer}>
                <ActivityIndicator size="small" color="#00A859" />
                <Text style={styles.optimizingText}>
                  Optimizing photo below 1MB...
                </Text>
              </View>
            ) : customerPhoto ? (
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: customerPhoto.uri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <View style={styles.previewInfo}>
                  <View style={styles.badgeRow}>
                    <Text style={styles.previewBadge}>Ready to upload</Text>
                    {customerPhoto.sizeFormatted ? (
                      <Text style={styles.sizeBadge}>
                        ⚡ {customerPhoto.sizeFormatted}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.previewFilename} numberOfLines={1}>
                    {customerPhoto.name}
                  </Text>
                  <View style={styles.previewActionRow}>
                    <TouchableOpacity
                      style={styles.actionBtnSmall}
                      onPress={() => handlePickPhoto("customer", "camera")}
                      disabled={uploading || Boolean(optimizingTarget)}
                    >
                      <Text style={styles.actionBtnSmallText}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtnSmall}
                      onPress={() => handlePickPhoto("customer", "gallery")}
                      disabled={uploading || Boolean(optimizingTarget)}
                    >
                      <Text style={styles.actionBtnSmallText}>Gallery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeBtnSmall}
                      onPress={() => setCustomerPhoto(null)}
                      disabled={uploading || Boolean(optimizingTarget)}
                    >
                      <Text style={styles.removeBtnSmallText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.buttonChoiceRow}>
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => handlePickPhoto("customer", "camera")}
                  disabled={uploading || Boolean(optimizingTarget)}
                >
                  <MaterialCommunityIcons
                    name="camera"
                    size={22}
                    color="#00A859"
                  />
                  <Text style={styles.pickerBtnText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => handlePickPhoto("customer", "gallery")}
                  disabled={uploading || Boolean(optimizingTarget)}
                >
                  <MaterialCommunityIcons
                    name="image"
                    size={22}
                    color="#00A859"
                  />
                  <Text style={styles.pickerBtnText}>From Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Section 2: ID Proof Photo */}
          <View style={styles.cardSection}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name="card-account-details-outline"
                  size={22}
                  color="#2563eb"
                />
              </View>
              <View style={styles.cardTitleWrap}>
                <Text style={styles.sectionTitle}>
                  2. Customer ID Proof Photo
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Aadhaar, Voter ID, PAN, or Govt Issued Document
                </Text>
              </View>
              {currentIdProofUploaded ? (
                <View style={styles.badgeDone}>
                  <Text style={styles.badgeDoneText}>✅ On File</Text>
                </View>
              ) : (
                <View style={styles.badgePending}>
                  <Text style={styles.badgePendingText}>⚠️ Missing</Text>
                </View>
              )}
            </View>

            {optimizingTarget === "idProof" ? (
              <View
                style={[
                  styles.optimizingContainer,
                  styles.optimizingContainerDoc,
                ]}
              >
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={[styles.optimizingText, { color: "#1d4ed8" }]}>
                  Optimizing ID proof below 1MB...
                </Text>
              </View>
            ) : idProofPhoto ? (
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: idProofPhoto.uri }}
                  style={[styles.previewImage, styles.previewImageDoc]}
                  resizeMode="cover"
                />
                <View style={styles.previewInfo}>
                  <View style={styles.badgeRow}>
                    <Text style={styles.previewBadge}>Ready to upload</Text>
                    {idProofPhoto.sizeFormatted ? (
                      <Text style={styles.sizeBadge}>
                        ⚡ {idProofPhoto.sizeFormatted}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.previewFilename} numberOfLines={1}>
                    {idProofPhoto.name}
                  </Text>
                  <View style={styles.previewActionRow}>
                    <TouchableOpacity
                      style={styles.actionBtnSmall}
                      onPress={() => handlePickPhoto("idProof", "camera")}
                      disabled={uploading || Boolean(optimizingTarget)}
                    >
                      <Text style={styles.actionBtnSmallText}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtnSmall}
                      onPress={() => handlePickPhoto("idProof", "gallery")}
                      disabled={uploading || Boolean(optimizingTarget)}
                    >
                      <Text style={styles.actionBtnSmallText}>Gallery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeBtnSmall}
                      onPress={() => setIdProofPhoto(null)}
                      disabled={uploading || Boolean(optimizingTarget)}
                    >
                      <Text style={styles.removeBtnSmallText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.buttonChoiceRow}>
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => handlePickPhoto("idProof", "camera")}
                  disabled={uploading || Boolean(optimizingTarget)}
                >
                  <MaterialCommunityIcons
                    name="camera"
                    size={22}
                    color="#2563eb"
                  />
                  <Text style={styles.pickerBtnText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => handlePickPhoto("idProof", "gallery")}
                  disabled={uploading || Boolean(optimizingTarget)}
                >
                  <MaterialCommunityIcons
                    name="image"
                    size={22}
                    color="#2563eb"
                  />
                  <Text style={styles.pickerBtnText}>From Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Upload Hint */}
          <View style={styles.infoHintBox}>
            <MaterialCommunityIcons
              name="information-outline"
              size={18}
              color="#6b7280"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.infoHintText}>
              You can upload both photos together or update either one
              individually. Clear photos ensure faster verification.
            </Text>
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            disabled={uploading}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.uploadBtn, !canSubmit && styles.uploadBtnDisabled]}
            onPress={handleUpload}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {uploading ? (
              <View style={styles.uploadingRow}>
                <ActivityIndicator
                  size="small"
                  color="#ffffff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.uploadBtnText}>Uploading Photos...</Text>
              </View>
            ) : (
              <View style={styles.uploadingRow}>
                <MaterialCommunityIcons
                  name="cloud-upload"
                  size={20}
                  color="#ffffff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.uploadBtnText}>Upload KYC Photos</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitleWrap: {
    flex: 1,
    paddingRight: 12,
  },
  headerBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: "#00A859",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  customerName: {
    fontWeight: "800",
    color: "#111827",
    textTransform: "capitalize",
  },
  customerIdText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "600",
  },
  cardSection: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  cardTitleWrap: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  sectionSubtitle: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  badgeDone: {
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeDoneText: {
    color: "#065f46",
    fontSize: 11,
    fontWeight: "700",
  },
  badgePending: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgePendingText: {
    color: "#92400e",
    fontSize: 11,
    fontWeight: "700",
  },
  buttonChoiceRow: {
    flexDirection: "row",
    gap: 12,
  },
  pickerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f9fafb",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    borderRadius: 14,
    paddingVertical: 16,
  },
  pickerBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  previewContainer: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
  },
  previewImageDoc: {
    width: 90,
    height: 70,
  },
  previewInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  sizeBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0369a1",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  optimizingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  optimizingContainerDoc: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  optimizingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#15803d",
  },
  previewBadge: {
    alignSelf: "flex-start",
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
    backgroundColor: "#d1fae5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: "uppercase",
  },
  previewFilename: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  previewActionRow: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtnSmall: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionBtnSmallText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
  },
  removeBtnSmall: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  removeBtnSmallText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#dc2626",
  },
  infoHintBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  infoHintText: {
    flex: 1,
    fontSize: 11,
    color: "#4b5563",
    lineHeight: 16,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4b5563",
  },
  uploadBtn: {
    flex: 2,
    backgroundColor: "#00A859",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  uploadBtnDisabled: {
    backgroundColor: "#9ca3af",
    opacity: 0.7,
  },
  uploadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
  },
});
