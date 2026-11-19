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
//               <Ionicons name="camera" size={20} color="#5B4DFF" />
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
//                 <Ionicons name="create-outline" size={20} color="#5B4DFF" />
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
//     backgroundColor: '#F4F6FB',
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
//     color: '#5B4DFF',
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
//     backgroundColor: '#5B4DFF',
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
//     borderColor: '#5B4DFF',
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
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, StatusBar, Alert, Image, Modal, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import BottomNavigation from '../components/BottomNavigation';
import AdminBottomNav from '../components/admin/AdminBottomNav';
import ScreenHeader from '../components/ScreenHeader';

import { useAuth } from '@/context/AuthContext';
import { getAssetImageUrl } from '@/services/assets';
import { showAlert } from '@/utils/showAlert';

const { width, height } = Dimensions.get('window');
const isWeb = width > 768;

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateProfileImage } = useAuth();
  const isAdmin = user?.role === 'admin';
  const profileImage = getAssetImageUrl(user?.profileImage);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <ScreenHeader
        title="Profile"
        variant="dark"
        fallbackHref={isAdmin ? '/admin' : '/home'}
      />

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
              {isAdmin ? <Text style={styles.adminBadge}>Admin</Text> : null}
              <Text style={styles.profileEmail}>{user?.email || ''}</Text>
              {user?.pendingEmail ? (
                <Text style={styles.profilePending}>
                  Pending: {user.pendingEmail} — verify to switch
                </Text>
              ) : null}
              <Text style={styles.profilePhone}>{user?.phoneNumber || ''}</Text>
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
                <Ionicons name="create-outline" size={20} color="#5B4DFF" />
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

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Bottom Navigation */}
      {isAdmin ? <AdminBottomNav /> : <BottomNavigation />}

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
    backgroundColor: '#F4F6FB',
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
    backgroundColor: '#5B4DFF',
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
    backgroundColor: '#5B4DFF',
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
  adminBadge: {
    alignSelf: 'flex-start',
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#EEF2FF',
    color: '#5B4DFF',
    fontSize: 12,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
  },
  profilePending: {
    fontSize: 12,
    color: '#5B4DFF',
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
  logoutButton: {
    backgroundColor: '#5B4DFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5B4DFF',
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