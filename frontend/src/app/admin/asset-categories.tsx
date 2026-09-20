import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import AdminShell from '@/components/admin/AdminShell';
import LiftPressable from '@/components/LiftPressable';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import {
  AdminAssetCategory,
  createAssetCategory,
  deleteAssetCategory,
  fetchAdminAssetCategories,
} from '@/services/assetCategories';

export default function AdminAssetCategoriesScreen() {
  const { token } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [categories, setCategories] = useState<AdminAssetCategory[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setCategories([]);
      setErrorMessage('Authentication required');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchAdminAssetCategories(token);
      setCategories(data);
      setErrorMessage('');
    } catch (error) {
      setCategories([]);
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to load categories.'
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleAdd = async () => {
    if (!token || saving) {
      return;
    }

    const name = newName.trim();
    if (!name) {
      setFormError('Category name is required');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      await createAssetCategory(token, name);
      setNewName('');
      setAddOpen(false);
      await load();
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Unable to add category.'
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (category: AdminAssetCategory) => {
    if (category.totalAssets > 0) {
      return;
    }

    const run = async () => {
      if (!token) {
        return;
      }
      setDeletingId(category.id);
      try {
        await deleteAssetCategory(token, category.id);
        await load();
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : 'Unable to delete category.';
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('Error', message);
        }
      } finally {
        setDeletingId(null);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${category.name}"?`)) {
        void run();
      }
      return;
    }

    Alert.alert('Delete category', `Delete "${category.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void run() },
    ]);
  };

  return (
    <AdminShell title="Asset Categories">
      <View style={styles.flex}>
        <View style={[styles.toolbar, isDesktop && styles.toolbarDesktop]}>
          <LiftPressable
            style={styles.addButton}
            onPress={() => {
              setFormError('');
              setNewName('');
              setAddOpen(true);
            }}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Category</Text>
          </LiftPressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.listContent,
            isDesktop && styles.listContentDesktop,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#323a8f" />
            </View>
          ) : errorMessage ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>{errorMessage}</Text>
            </View>
          ) : categories.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="layers-outline" size={42} color="#9FA8DA" />
              <Text style={styles.emptyTitle}>No categories yet</Text>
              <Text style={styles.emptyText}>
                Add a category so users can select it on Add Asset.
              </Text>
            </View>
          ) : (
            categories.map((category) => {
              const canDelete = category.totalAssets === 0;
              const deleting = deletingId === category.id;

              return (
                <View
                  key={category.id}
                  style={[styles.card, isDesktop && styles.cardDesktop]}
                >
                  <View style={styles.iconWrap}>
                    <Ionicons name="pricetag" size={20} color="#323a8f" />
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.name}>{category.name}</Text>
                    <View style={styles.countsRow}>
                      <Text style={styles.countPill}>
                        Total {category.totalAssets}
                      </Text>
                      <Text style={[styles.countPill, styles.countAvailable]}>
                        Available {category.availableAssets}
                      </Text>
                      <Text style={[styles.countPill, styles.countRented]}>
                        Rented {category.rentedAssets}
                      </Text>
                    </View>
                    {!canDelete ? (
                      <Text style={styles.hint}>
                        This type has assets, so it cannot be deleted.
                      </Text>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.deleteBtn,
                      !canDelete && styles.deleteBtnDisabled,
                    ]}
                    onPress={() => confirmDelete(category)}
                    disabled={!canDelete || deleting}
                    activeOpacity={0.75}
                  >
                    {deleting ? (
                      <ActivityIndicator size="small" color="#E53935" />
                    ) : (
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={canDelete ? '#E53935' : '#C5CAE9'}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      <Modal
        visible={addOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAddOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setAddOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>Add Category</Text>
            <Text style={styles.modalHint}>
              Users will see this in the Add Asset type list.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Warehouse"
              placeholderTextColor="#9FA8DA"
              value={newName}
              onChangeText={(value) => {
                setNewName(value);
                setFormError('');
              }}
              autoCapitalize="words"
            />
            {formError ? (
              <Text style={styles.formError}>{formError}</Text>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAddOpen(false)}
                disabled={saving}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <LiftPressable
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={() => void handleAdd()}
                disabled={saving}
              >
                <Text style={styles.saveText}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </LiftPressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  toolbar: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'flex-start',
  },
  toolbarDesktop: {
    paddingHorizontal: 28,
    paddingTop: 22,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#323a8f',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 10,
  },
  listContentDesktop: {
    paddingHorizontal: 28,
    maxWidth: 760,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EAF6',
    padding: 14,
    gap: 12,
  },
  cardDesktop: {
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 8,
  },
  countsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  countPill: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3949AB',
    backgroundColor: '#E8EAF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  countAvailable: {
    color: '#2E7D32',
    backgroundColor: '#E8F5E9',
  },
  countRented: {
    color: '#C62828',
    backgroundColor: '#FFEBEE',
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: '#7986CB',
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
  },
  deleteBtnDisabled: {
    backgroundColor: '#F5F5F5',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#323a8f',
  },
  emptyText: {
    fontSize: 14,
    color: '#7986CB',
    textAlign: 'center',
    maxWidth: 280,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 6,
  },
  modalHint: {
    fontSize: 13,
    color: '#7986CB',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E8EAF6',
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#1A237E',
    backgroundColor: '#FAFBFF',
  },
  formError: {
    marginTop: 8,
    color: '#E53935',
    fontSize: 13,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelText: {
    color: '#5C6BC0',
    fontWeight: '600',
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: '#323a8f',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
