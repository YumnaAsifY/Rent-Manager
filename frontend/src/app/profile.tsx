// import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, StatusBar, Alert, Image, Modal } from 'react-native';
// import { useRouter } from 'expo-router';
// import { Ionicons } from '@expo/vector-icons';
// import { useState } from 'react';
// import * as ImagePicker from 'expo-image-picker';
// import BottomNavigation from '../components/BottomNavigation';

// const { width, height } = Dimensions.get('window');
// const isWeb = width > 768;

// export default function ProfileScreen() {
//   const router = useRouter();
//   const [profileImage, setProfileImage] = useState<string | null>(null);
//   const [previewVisible, setPreviewVisible] = useState(false);

//   const handleLogout = () => {
//     Alert.alert(
//       'Logout',
//       'Are you sure you want to logout?',
//       [
//         { text: 'Cancel', style: 'cancel' },
//         { text: 'Logout', onPress: () => router.replace('/login') }
//       ]
//     );
//   };

//   // Image Picker Function
//   const pickImage = async () => {
//     const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
//     if (status !== 'granted') {
//       Alert.alert('Permission Required', 'Please allow access to your gallery to upload images.');
//       return;
//     }

//     const result = await ImagePicker.launchImageLibraryAsync({
//       mediaTypes: ImagePicker.MediaTypeOptions.Images,
//       allowsEditing: true,
//       aspect: [1, 1],
//       quality: 0.8,
//     });

//     if (!result.canceled) {
//       setProfileImage(result.assets[0].uri);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
//       {/* Header */}
//       <View style={styles.header}>
//         <Text style={styles.headerTitle}>Profile</Text>
//       </View>

//       <ScrollView 
//         style={styles.scrollView}
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}
//       >
//         {/* Profile Info */}
//         <View style={styles.profileCard}>
//           <View style={styles.profileRow}>
//             {/* Avatar - Click to VIEW */}
//             <TouchableOpacity 
//               style={styles.avatarWrapper} 
//               onPress={profileImage ? () => setPreviewVisible(true) : pickImage}
//               activeOpacity={0.8}
//             >
//               {profileImage ? (
//                 <Image source={{ uri: profileImage }} style={styles.profileAvatar} />
//               ) : (
//                 <View style={styles.profileAvatar}>
//                   <Text style={styles.avatarText}>Y</Text>
//                 </View>
//               )}
//             </TouchableOpacity>

//             {/* Camera Icon - Click to UPLOAD/CHANGE */}
//             <TouchableOpacity 
//               style={styles.cameraButton}
//               onPress={pickImage}
//               activeOpacity={0.8}
//             >
//               <Ionicons name="camera" size={20} color="#323a8f" />
//             </TouchableOpacity>

//             <View style={styles.profileInfo}>
//               <Text style={styles.profileName}>Yumna Asif</Text>
//               <Text style={styles.profileEmail}>yumnaasif123@gmail.com</Text>
//               <Text style={styles.profilePhone}>03259851109</Text>
//             </View>
//           </View>
//         </View>

//         {/* Profile Options */}
//         <View style={styles.optionsContainer}>
//           <TouchableOpacity 
//             style={styles.optionItem}
//             onPress={() => router.push('/edit-profile' as any)}
//           >
//             <View style={styles.optionLeft}>
//               <View style={[styles.optionIcon, { backgroundColor: '#EEF4FF' }]}>
//                 <Ionicons name="create-outline" size={20} color="#323a8f" />
//               </View>
//               <Text style={styles.optionText}>Edit Profile</Text>
//             </View>
//             <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
//           </TouchableOpacity>

//           <TouchableOpacity 
//             style={styles.optionItem}
//             onPress={() => router.push('/change-password' as any)}
//           >
//             <View style={styles.optionLeft}>
//               <View style={[styles.optionIcon, { backgroundColor: '#F0FAF5' }]}>
//                 <Ionicons name="lock-closed-outline" size={20} color="#2EAD6E" />
//               </View>
//               <Text style={styles.optionText}>Change Password</Text>
//             </View>
//             <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
//           </TouchableOpacity>
//         </View>

//         {/* Logout Button */}
//         <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
//           <Text style={styles.logoutButtonText}>Logout</Text>
//         </TouchableOpacity>

//         <View style={styles.bottomSpacing} />
//       </ScrollView>

//       {/* Bottom Navigation */}
//       <BottomNavigation />

//       {/* Image Preview Modal */}
//       <Modal
//         visible={previewVisible}
//         transparent={true}
//         animationType="fade"
//         onRequestClose={() => setPreviewVisible(false)}
//       >
//         <View style={styles.modalOverlay}>
//           <TouchableOpacity 
//             style={styles.modalCloseButton}
//             onPress={() => setPreviewVisible(false)}
//           >
//             <Ionicons name="close" size={28} color="#FFFFFF" />
//           </TouchableOpacity>
          
//           <Image 
//             source={{ uri: profileImage || '' }} 
//             style={styles.modalImage}
//             resizeMode="contain"
//           />
          
//           <Text style={styles.modalHint}>Tap anywhere to close</Text>
//         </View>
//       </Modal>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F8FAFC',
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingHorizontal: 20,
//     paddingTop: 50,
//     paddingBottom: 16,
//     backgroundColor: '#FFFFFF',
//     borderBottomWidth: 1,
//     borderBottomColor: '#E8EAF6',
//   },
//   headerTitle: {
//     fontSize: 20,
//     fontWeight: '600',
//     color: '#323a8f',
//   },
//   scrollView: {
//     flex: 1,
//   },
//   scrollContent: {
//     paddingHorizontal: 20,
//     paddingTop: 20,
//     paddingBottom: 100,
//   },
//   profileCard: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 16,
//     padding: 20,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.06,
//     shadowRadius: 8,
//     elevation: 3,
//     marginBottom: 24,
//     borderWidth: 1,
//     borderColor: '#F1F5F9',
//   },
//   profileRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//   },
//   avatarWrapper: {
//     position: 'relative',
//     width: 70,
//     height: 70,
//   },
//   profileAvatar: {
//     width: 70,
//     height: 70,
//     borderRadius: 35,
//     backgroundColor: '#323a8f',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   avatarText: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     color: '#FFFFFF',
//   },
//   cameraButton: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     backgroundColor: '#EEF4FF',
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: '#323a8f',
//     marginLeft: -8,
//   },
//   profileInfo: {
//     flex: 1,
//   },
//   profileName: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#1A1A1A',
//     marginBottom: 2,
//   },
//   profileEmail: {
//     fontSize: 14,
//     color: '#64748B',
//     marginBottom: 2,
//   },
//   profilePhone: {
//     fontSize: 14,
//     color: '#64748B',
//   },
//   optionsContainer: {
//     marginBottom: 24,
//   },
//   optionItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     backgroundColor: '#FFFFFF',
//     borderRadius: 12,
//     paddingVertical: 14,
//     paddingHorizontal: 16,
//     marginBottom: 8,
//     borderWidth: 1,
//     borderColor: '#F1F5F9',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.04,
//     shadowRadius: 4,
//     elevation: 1,
//   },
//   optionLeft: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//   },
//   optionIcon: {
//     width: 40,
//     height: 40,
//     borderRadius: 10,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   optionText: {
//     fontSize: 16,
//     color: '#1A1A1A',
//   },
//   logoutButton: {
//     backgroundColor: '#505bd4',
//     borderRadius: 12,
//     paddingVertical: 16,
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowColor: '#505bd4',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   logoutButtonText: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#FFFFFF',
//   },
//   bottomSpacing: {
//     height: 20,
//   },
//   // Modal Styles
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.92)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   modalCloseButton: {
//     position: 'absolute',
//     top: 50,
//     right: 20,
//     zIndex: 10,
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     backgroundColor: 'rgba(255,255,255,0.2)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   modalImage: {
//     width: width * 0.9,
//     height: height * 0.7,
//     borderRadius: 16,
//   },
//   modalHint: {
//     position: 'absolute',
//     bottom: 60,
//     color: 'rgba(255,255,255,0.5)',
//     fontSize: 14,
//   },
// });
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, StatusBar, Alert, Image, Modal, Platform, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import BottomNavigation from '../components/BottomNavigation';
import ScreenHeader from '../components/ScreenHeader';

import { PayoutMethod, useAuth } from '@/context/AuthContext';
import { getAssetImageUrl } from '@/services/assets';
import { showAlert } from '@/utils/showAlert';
import LiftPressable from '../components/LiftPressable';

const { width, height } = Dimensions.get('window');
const isWeb = width > 768;

const PAYOUT_OPTIONS: { key: PayoutMethod; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'jazzcash', label: 'JazzCash' },
  { key: 'easypaisa', label: 'EasyPaisa' },
  { key: 'bank', label: 'Bank' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const showPayoutMethod = true;
  const { user, logout, updateProfile, updateProfileImage } = useAuth();
  const profileImage = getAssetImageUrl(user?.profileImage);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>(
    user?.payoutMethod || 'none'
  );
  const [payoutAccountName, setPayoutAccountName] = useState(
    user?.payoutAccountName || ''
  );
  const [payoutNumber, setPayoutNumber] = useState(user?.payoutNumber || '');
  const [payoutBankName, setPayoutBankName] = useState(
    user?.payoutBankName || ''
  );
  const [isSavingPayout, setIsSavingPayout] = useState(false);
  const [payoutAccountNameError, setPayoutAccountNameError] = useState('');

  const isValidAccountHolderName = (value: string) =>
    /^[A-Za-z][A-Za-z '\u2019-]*$/.test(value.trim());

  const performLogout = async () => {
    try {
      await logout();
      router.replace('/login' as any);
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Unable to log out. Please try again.');
    }
  };

  const handleLogout = () => {
    // Alert.alert multi-button confirm is unreliable on web.
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) {
        void performLogout();
      }
      return;
    }

    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: () => void performLogout() },
    ]);
  };

  // Image Picker Function
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your gallery to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      try {
        setIsUploadingImage(true);
        await updateProfileImage(
          asset.uri,
          asset.mimeType,
          asset.fileName
        );
      } catch (error: any) {
        showAlert(
          'Error',
          error?.message || 'Unable to save profile picture. Please try again.'
        );
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const validateWalletNumber = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 11) {
      setPayoutNumber(numericText);
    }
  };

  const handleSavePayout = async () => {
    if (!user) {
      return;
    }

    if (payoutMethod !== 'none') {
      if (!payoutAccountName.trim()) {
        setPayoutAccountNameError('Please enter the account holder name.');
        return;
      }

      if (!isValidAccountHolderName(payoutAccountName)) {
        setPayoutAccountNameError(
          'Use letters, spaces, hyphen and apostrophe only.'
        );
        return;
      }

      if (payoutMethod === 'bank') {
        if (!payoutBankName.trim()) {
          showAlert('Error', 'Please enter the bank name.');
          return;
        }

        if (payoutNumber.replace(/\s+/g, '').length < 8) {
          showAlert('Error', 'Enter a valid bank account number or IBAN.');
          return;
        }
      } else if (payoutNumber.length !== 11) {
        showAlert('Error', 'Wallet number must be exactly 11 digits.');
        return;
      }
    }

    try {
      setIsSavingPayout(true);
      await updateProfile(user.name, user.phoneNumber, {
        payoutMethod,
        payoutAccountName: payoutAccountName.trim(),
        payoutNumber: payoutNumber.replace(/\s+/g, ''),
        payoutBankName: payoutBankName.trim(),
      });
      showAlert('Payout details saved');
    } catch (error: any) {
      showAlert(
        'Error',
        error?.message || 'Unable to save payout details. Please try again.'
      );
    } finally {
      setIsSavingPayout(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#323a8f" />
      
      <ScreenHeader title="Profile" variant="dark" />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Info */}
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            {/* Avatar - Click to VIEW */}
            <TouchableOpacity 
              style={styles.avatarWrapper} 
              onPress={profileImage ? () => setPreviewVisible(true) : pickImage}
              activeOpacity={0.8}
            >
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileAvatar} />
              ) : (
                <View style={styles.profileAvatar}>
                  <Text style={styles.avatarText}>
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              
              {/* Camera Icon - Click to UPLOAD/CHANGE */}
              <TouchableOpacity 
                style={styles.uploadIcon}
                onPress={pickImage}
                disabled={isUploadingImage}
                activeOpacity={0.8}
              >
                {isUploadingImage ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </TouchableOpacity>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || 'User'}</Text>
              <Text style={styles.profileEmail}>{user?.email || ''}</Text>
              {user?.pendingEmail ? (
                <Text style={styles.profilePending}>
                  Pending: {user.pendingEmail} — verify to switch
                </Text>
              ) : null}
              <Text style={styles.profilePhone}>{user?.phoneNumber || ''}</Text>
              {showPayoutMethod ? (
                user?.payoutMethod && user.payoutMethod !== 'none' ? (
                  <Text style={styles.profilePhone}>
                    {user.payoutMethod === 'jazzcash'
                      ? 'JazzCash'
                      : user.payoutMethod === 'easypaisa'
                        ? 'EasyPaisa'
                        : user.payoutBankName || 'Bank'}
                    {user.payoutNumber ? ` · ${user.payoutNumber}` : ''}
                  </Text>
                ) : (
                  <Text style={styles.profilePhone}>Payout details not saved</Text>
                )
              ) : null}
            </View>
          </View>
        </View>

        {/* Profile Options */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={() => router.push('/edit-profile' )}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.optionIcon, { backgroundColor: '#EEF4FF' }]}>
                <Ionicons name="create-outline" size={20} color="#323a8f" />
              </View>
              <Text style={styles.optionText}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionItem}
            onPress={() => router.push('/change-password' as any)}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.optionIcon, { backgroundColor: '#F0FAF5' }]}>
                <Ionicons name="lock-closed-outline" size={20} color="#2EAD6E" />
              </View>
              <Text style={styles.optionText}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {showPayoutMethod ? (
          <View style={styles.payoutCard}>
            <Text style={styles.payoutTitle}>Owner payout method</Text>
            <Text style={styles.payoutHint}>
              Admin uses this to send your rent share (JazzCash, EasyPaisa, or
              bank). You receive 97% of each rent payment; 3% is the admin
              commission.
            </Text>
            <View style={styles.methodRow}>
              {PAYOUT_OPTIONS.map((option) => {
                const active = payoutMethod === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.methodChip,
                      active && styles.methodChipActive,
                    ]}
                    onPress={() => setPayoutMethod(option.key)}
                    disabled={isSavingPayout}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.methodChipText,
                        active && styles.methodChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {payoutMethod !== 'none' ? (
              <>
                <Text style={styles.payoutLabel}>Account holder name</Text>
                <TextInput
                  style={styles.payoutInput}
                  placeholder="Name on JazzCash / bank account"
                  placeholderTextColor="#94A3B8"
                  value={payoutAccountName}
                  onChangeText={(text) => {
                    setPayoutAccountName(text);
                    if (!text.trim()) {
                      setPayoutAccountNameError('');
                      return;
                    }
                    setPayoutAccountNameError(
                      isValidAccountHolderName(text)
                        ? ''
                        : 'Use letters, spaces, hyphen and apostrophe only.'
                    );
                  }}
                  editable={!isSavingPayout}
                  autoCapitalize="words"
                />
                {payoutAccountNameError ? (
                  <Text style={styles.payoutErrorText}>
                    {payoutAccountNameError}
                  </Text>
                ) : null}

                {payoutMethod === 'bank' ? (
                  <>
                    <Text style={styles.payoutLabel}>Bank name</Text>
                    <TextInput
                      style={styles.payoutInput}
                      placeholder="e.g. HBL, Meezan"
                      placeholderTextColor="#94A3B8"
                      value={payoutBankName}
                      onChangeText={setPayoutBankName}
                      editable={!isSavingPayout}
                      autoCapitalize="words"
                    />
                  </>
                ) : null}

                <Text style={styles.payoutLabel}>
                  {payoutMethod === 'bank'
                    ? 'Account number / IBAN'
                    : 'Wallet number'}
                </Text>
                <TextInput
                  style={styles.payoutInput}
                  placeholder={
                    payoutMethod === 'bank'
                      ? 'Account number or IBAN'
                      : '11-digit wallet number'
                  }
                  placeholderTextColor="#94A3B8"
                  keyboardType={
                    payoutMethod === 'bank' ? 'default' : 'phone-pad'
                  }
                  value={payoutNumber}
                  onChangeText={
                    payoutMethod === 'bank'
                      ? setPayoutNumber
                      : validateWalletNumber
                  }
                  maxLength={payoutMethod === 'bank' ? 34 : 11}
                  editable={!isSavingPayout}
                  autoCapitalize="characters"
                />
              </>
            ) : null}

            <LiftPressable
              style={[
                styles.payoutSaveButton,
                isSavingPayout && styles.payoutSaveButtonDisabled,
              ]}
              onPress={() => void handleSavePayout()}
              disabled={isSavingPayout}
            >
              {isSavingPayout ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.payoutSaveButtonText}>
                  Save payout method
                </Text>
              )}
            </LiftPressable>
          </View>
        ) : null}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* Image Preview Modal */}
      <Modal
        visible={previewVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => setPreviewVisible(false)}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Image 
            source={{ uri: profileImage || '' }} 
            style={styles.modalImage}
            resizeMode="contain"
          />
          
          <Text style={styles.modalHint}>Tap anywhere to close</Text>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrapper: {
    position: 'relative',
    width: 70,
    height: 70,
  },
  profileAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#323a8f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Camera Icon - Same Position (Bottom-Right Corner)
  uploadIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#323a8f',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
  },
  profilePending: {
    fontSize: 12,
    color: '#323a8f',
    marginBottom: 2,
  },
  profilePhone: {
    fontSize: 14,
    color: '#64748B',
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  payoutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  payoutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  payoutHint: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 18,
  },
  methodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  methodChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C5CAE9',
  },
  methodChipActive: {
    backgroundColor: '#323a8f',
    borderColor: '#323a8f',
  },
  methodChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3949AB',
  },
  methodChipTextActive: {
    color: '#FFFFFF',
  },
  payoutLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
    marginTop: 4,
  },
  payoutInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1A1A1A',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  payoutErrorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: -6,
    marginBottom: 10,
  },
  payoutSaveButton: {
    alignSelf: 'flex-start',
    height: 40,
    paddingHorizontal: 16,
    backgroundColor: '#323a8f',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  payoutSaveButtonDisabled: {
    opacity: 0.7,
  },
  payoutSaveButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logoutButton: {
    backgroundColor: '#323a8f',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#323a8f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomSpacing: {
    height: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: width * 0.9,
    height: height * 0.7,
    borderRadius: 16,
  },
  modalHint: {
    position: 'absolute',
    bottom: 60,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
});