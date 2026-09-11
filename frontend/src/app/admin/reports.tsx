import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import AdminShell from '@/components/admin/AdminShell';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import {
  UserReport,
  fetchAdminReports,
  reviewAdminReport,
} from '@/services/reports';

const typeLabel = (type: UserReport['type']) => {
  if (type === 'fake_property') return 'Fake listing';
  if (type === 'unpaid_rent') return 'Unpaid rent';
  return 'Spam / misuse';
};

export default function AdminReportsScreen() {
  const { token } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [reports, setReports] = useState<UserReport[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setReports([]);
      setErrorMessage('Authentication required');
      return;
    }
    try {
      const data = await fetchAdminReports(token);
      setReports(data);
      setErrorMessage('');
    } catch (error) {
      setReports([]);
      setErrorMessage(
        error instanceof ApiError ? error.message : 'Unable to load reports.'
      );
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const runAction = async (
    report: UserReport,
    action: 'dismiss' | 'warn' | 'deactivate'
  ) => {
    if (!token || busyId) {
      return;
    }
    setBusyId(report.id);
    try {
      await reviewAdminReport(token, report.id, action);
      await load();
    } catch (error) {
      const text =
        error instanceof ApiError ? error.message : 'Unable to update report.';
      if (Platform.OS === 'web') {
        window.alert(text);
      } else {
        Alert.alert('Error', text);
      }
    } finally {
      setBusyId(null);
    }
  };

  const confirmAction = (
    report: UserReport,
    action: 'dismiss' | 'warn' | 'deactivate',
    title: string,
    message: string
  ) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) {
        void runAction(report, action);
      }
      return;
    }
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: title,
        style: action === 'dismiss' ? 'default' : 'destructive',
        onPress: () => void runAction(report, action),
      },
    ]);
  };

  return (
    <AdminShell title="Reports">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.body, isDesktop && styles.bodyDesktop]}
        showsVerticalScrollIndicator={false}
      >
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : reports.length === 0 ? (
          <Text style={styles.emptyText}>No reports yet.</Text>
        ) : (
          reports.map((report) => {
            const open =
              report.status === 'pending' || report.status === 'warned';
            return (
              <View key={report.id} style={styles.card}>
                <Text style={styles.type}>{typeLabel(report.type)}</Text>
                <Text style={styles.meta}>
                  Against {report.reportedUserName} · by {report.reporterName}
                </Text>
                <Text style={styles.status}>{report.status}</Text>
                {open ? (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      onPress={() =>
                        confirmAction(
                          report,
                          'dismiss',
                          'Dismiss',
                          'Close this report without blocking the user?'
                        )
                      }
                      disabled={Boolean(busyId)}
                    >
                      <Text style={styles.dismissText}>Dismiss</Text>
                    </TouchableOpacity>
                    {report.type === 'unpaid_rent' &&
                    report.status === 'pending' ? (
                      <TouchableOpacity
                        onPress={() =>
                          confirmAction(
                            report,
                            'warn',
                            'Warn tenant',
                            'Send a payment warning notification to this tenant?'
                          )
                        }
                        disabled={Boolean(busyId)}
                      >
                        <Text style={styles.warnText}>Warn</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      onPress={() =>
                        confirmAction(
                          report,
                          'deactivate',
                          'Block login',
                          `Block ${report.reportedUserName} from logging in?`
                        )
                      }
                      disabled={Boolean(busyId)}
                    >
                      <Text style={styles.blockText}>Block</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  body: { padding: 16, paddingBottom: 28 },
  bodyDesktop: { padding: 28, paddingBottom: 40, maxWidth: 720 },
  errorText: { color: '#C62828', fontSize: 14 },
  emptyText: { color: '#5C6BC0', fontSize: 14 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8EAF6',
  },
  type: { fontSize: 16, fontWeight: '700', color: '#1A237E' },
  meta: { marginTop: 4, fontSize: 13, color: '#5C6BC0' },
  status: { marginTop: 6, fontSize: 12, fontWeight: '600', color: '#64748B' },
  actions: { flexDirection: 'row', gap: 16, marginTop: 12 },
  dismissText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  warnText: { fontSize: 14, fontWeight: '600', color: '#E6A046' },
  blockText: { fontSize: 14, fontWeight: '600', color: '#C62828' },
});
