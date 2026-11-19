import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import BottomNavigation from '../components/BottomNavigation';
import CenteredStatusModal from '../components/CenteredStatusModal';
import ScreenHeader from '../components/ScreenHeader';
import LiftPressable from '../components/LiftPressable';
import { useAuth } from '@/context/AuthContext';
import { ApiError, apiRequest } from '@/services/api';

const MESSAGE_MAX = 1000;

export default function ContactUsScreen() {
  const { user, token } = useAuth();
  const [adminEmail, setAdminEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    subject?: string;
    message?: string;
  }>({});
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [sendError, setSendError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadInfo = async () => {
        if (!token) {
          return;
        }

        try {
          const data = await apiRequest<{ adminEmail?: string }>(
            '/api/contact',
            { method: 'GET' },
            token
          );
          if (isMounted && data.adminEmail) {
            setAdminEmail(data.adminEmail);
          }
        } catch {
          if (isMounted) {
            setAdminEmail('');
          }
        }
      };

      void loadInfo();

      return () => {
        isMounted = false;
      };
    }, [token])
  );

  const handleSend = async () => {
    const nextErrors: { subject?: string; message?: string } = {};
    if (!subject.trim()) {
      nextErrors.subject = 'Subject is required';
    }
    if (!message.trim()) {
      nextErrors.message = 'Message is required';
    }

    setFieldErrors(nextErrors);
    setSendError('');

    if (Object.keys(nextErrors).length > 0 || !token) {
      return;
    }

    setIsSending(true);
    try {
      await apiRequest(
        '/api/contact',
        {
          method: 'POST',
          body: JSON.stringify({
            subject: subject.trim(),
            message: message.trim(),
          }),
        },
        token
      );
      setShowSuccess(true);
      setSubject('');
      setMessage('');
    } catch (error) {
      setSendError(
        error instanceof ApiError
          ? error.message
          : 'Unable to send your message. Please try again.'
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScreenHeader title="Contact Us" variant="dark" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <View style={styles.mailIconWrap}>
              <Ionicons name="mail-outline" size={22} color="#5B4DFF" />
            </View>
            <View style={styles.titleCopy}>
              <Text style={styles.pageTitle}>Contact Us</Text>
              <Text style={styles.intro}>
                Have a question, issue, or feedback? Send us a message and our
                admin will get back to you.
              </Text>
            </View>
          </View>

          <View style={styles.adminBanner}>
            <Ionicons name="mail-outline" size={18} color="#5B4DFF" />
            <View style={styles.adminBannerCopy}>
              <Text style={styles.adminEmail}>
                Admin Email: {adminEmail || 'Not configured'}
              </Text>
              <Text style={styles.adminHint}>
                Your message will be sent to our admin  at the above email
                address.
              </Text>
            </View>
          </View>

          <View style={styles.nameEmailRow}>
            <View style={[styles.inputContainer, styles.halfField]}>
              <Text style={styles.label}>Your Name</Text>
              <View style={[styles.input, styles.inputReadonly, styles.iconInput]}>
                <Ionicons name="person-outline" size={16} color="#94A3B8" />
                <Text style={styles.readonlyText} numberOfLines={1}>
                  {user?.name || ''}
                </Text>
              </View>
            </View>
            <View style={[styles.inputContainer, styles.halfField]}>
              <Text style={styles.label}>Your Email</Text>
              <View style={[styles.input, styles.inputReadonly, styles.iconInput]}>
                <Ionicons name="mail-outline" size={16} color="#94A3B8" />
                <Text style={styles.readonlyText} numberOfLines={1}>
                  {user?.email || ''}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Subject <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.iconInputWrap}>
              <Ionicons
                name="document-text-outline"
                size={16}
                color="#94A3B8"
                style={styles.fieldIcon}
              />
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                placeholder="What is this about?"
                placeholderTextColor="#94A3B8"
                value={subject}
                onChangeText={(text) => {
                  setSubject(text);
                  setFieldErrors((prev) => ({ ...prev, subject: undefined }));
                }}
                editable={!isSending}
              />
            </View>
            {fieldErrors.subject ? (
              <Text style={styles.fieldErrorText}>{fieldErrors.subject}</Text>
            ) : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Message / Feedback <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.textAreaWrap}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={16}
                color="#94A3B8"
                style={styles.textAreaIcon}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Write your question, issue, or suggestion..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={MESSAGE_MAX}
                value={message}
                onChangeText={(text) => {
                  setMessage(text);
                  setFieldErrors((prev) => ({ ...prev, message: undefined }));
                }}
                editable={!isSending}
              />
              <Text style={styles.counter}>
                {message.length}/{MESSAGE_MAX}
              </Text>
            </View>
            {fieldErrors.message ? (
              <Text style={styles.fieldErrorText}>{fieldErrors.message}</Text>
            ) : null}
          </View>

          {sendError ? (
            <Text style={styles.sendErrorText}>{sendError}</Text>
          ) : null}

          <LiftPressable
            style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
            onPress={() => void handleSend()}
            disabled={isSending}
          >
            {isSending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="send" size={16} color="#FFFFFF" />
                <Text style={styles.sendButtonText}>Send Message</Text>
              </>
            )}
          </LiftPressable>
        </View>
      </ScrollView>

      <BottomNavigation />

      <CenteredStatusModal
        visible={showSuccess}
        variant="success"
        title="Message Sent Successfully!"
        message="Your message has been sent to the Admin. We will get back to you through your registered email."
        buttonLabel="OK"
        onButtonPress={() => setShowSuccess(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8EEF7',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  mailIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCopy: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5B4DFF',
    marginBottom: 4,
  },
  intro: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EEF4FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  adminBannerCopy: {
    flex: 1,
  },
  adminEmail: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5B4DFF',
    marginBottom: 2,
  },
  adminHint: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  nameEmailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  halfField: {
    flexGrow: 1,
    flexBasis: 220,
    minWidth: 0,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1A1A1A',
    backgroundColor: '#FFFFFF',
  },
  inputReadonly: {
    backgroundColor: '#F8FAFC',
  },
  iconInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  readonlyText: {
    flex: 1,
    fontSize: 15,
    color: '#475569',
  },
  iconInputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  fieldIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  inputWithIcon: {
    paddingLeft: 38,
  },
  textAreaWrap: {
    position: 'relative',
  },
  textAreaIcon: {
    position: 'absolute',
    top: 16,
    left: 14,
    zIndex: 1,
  },
  textArea: {
    height: 160,
    paddingTop: 14,
    paddingLeft: 38,
    paddingBottom: 28,
  },
  counter: {
    position: 'absolute',
    right: 12,
    bottom: 8,
    fontSize: 11,
    color: '#94A3B8',
  },
  fieldErrorText: {
    fontSize: 13,
    color: '#EF4444',
    marginTop: 6,
  },
  sendErrorText: {
    fontSize: 13,
    color: '#EF4444',
    marginBottom: 12,
  },
  sendButton: {
    alignSelf: 'flex-start',
    minHeight: 46,
    paddingHorizontal: 20,
    backgroundColor: '#5B4DFF',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
