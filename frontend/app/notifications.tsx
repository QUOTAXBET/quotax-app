import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../src/context/AuthContext';
import { notificationsAPI } from '../src/utils/api';
import { colors } from '../src/utils/theme';

interface Notification {
  notification_id: string;
  type: string;
  title: string;
  body: string;
  detail?: string;
  icon: string;
  color: string;
  read: boolean;
  created_at: string;
  action_url?: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userId = user?.user_id || 'guest_demo';

  const fetchNotifications = async () => {
    try {
      const data = await notificationsAPI.getAll(userId);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchNotifications(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchNotifications(); }, []);

  const handleMarkRead = async (notif: Notification) => {
    if (!notif.read) {
      Haptics.selectionAsync();
      try {
        await notificationsAPI.markRead(notif.notification_id);
        setNotifications(prev => prev.map(n => n.notification_id === notif.notification_id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {}
    }
    // Navigate to action URL if available
    if (notif.action_url) {
      const route = notif.action_url as any;
      if (route === '/live') router.push('/(tabs)/live');
      else if (route === '/schedine') router.push('/(tabs)/schedine');
      else if (route === '/profile') router.push('/(tabs)/profile');
      else if (route === '/subscribe') router.push('/subscribe');
      else router.push('/(tabs)/');
    }
  };

  const handleMarkAllRead = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await notificationsAPI.markAllRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleDelete = async (notifId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await notificationsAPI.deleteNotification(notifId);
      setNotifications(prev => prev.filter(n => n.notification_id !== notifId));
    } catch {}
  };

  const getTimeAgo = (dateStr: string): string => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Ora';
    if (diffMin < 60) return `${diffMin} min fa`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h fa`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}g fa`;
  };

  if (loading) return <View style={s.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /><Text style={s.loadingText}>Caricamento notifiche...</Text></View>;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Ionicons name="notifications" size={20} color={colors.primary} />
          <Text style={s.headerTitle}>Notifiche</Text>
          {unreadCount > 0 && <View style={s.headerBadge}><Text style={s.headerBadgeText}>{unreadCount}</Text></View>}
        </View>
        <View style={s.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead} style={s.markAllBtn}>
              <Ionicons name="checkmark-done" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => router.push('/notification-settings')} style={s.settingsBtn}>
            <Ionicons name="settings-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {notifications.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
            <Text style={s.emptyTitle}>Nessuna notifica</Text>
            <Text style={s.emptySub}>Le notifiche appariranno qui quando ci saranno aggiornamenti</Text>
          </View>
        ) : (
          <>
            {/* Unread section */}
            {notifications.filter(n => !n.read).length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Non lette</Text>
                {notifications.filter(n => !n.read).map(notif => (
                  <TouchableOpacity key={notif.notification_id} style={[s.notifCard, s.notifUnread]} onPress={() => handleMarkRead(notif)} activeOpacity={0.7}>
                    <View style={[s.notifIcon, { backgroundColor: notif.color + '18' }]}>
                      <Ionicons name={notif.icon as any} size={20} color={notif.color} />
                    </View>
                    <View style={s.notifContent}>
                      <View style={s.notifTopRow}>
                        <Text style={s.notifTitle}>{notif.title}</Text>
                        <Text style={s.notifTime}>{getTimeAgo(notif.created_at)}</Text>
                      </View>
                      <Text style={s.notifBody}>{notif.body}</Text>
                      {notif.detail && <Text style={s.notifDetail}>{notif.detail}</Text>}
                    </View>
                    <View style={s.unreadDot} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Read section */}
            {notifications.filter(n => n.read).length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Precedenti</Text>
                {notifications.filter(n => n.read).map(notif => (
                  <TouchableOpacity key={notif.notification_id} style={s.notifCard} onPress={() => handleMarkRead(notif)} activeOpacity={0.7}>
                    <View style={[s.notifIcon, { backgroundColor: notif.color + '10' }]}>
                      <Ionicons name={notif.icon as any} size={20} color={notif.color + '80'} />
                    </View>
                    <View style={s.notifContent}>
                      <View style={s.notifTopRow}>
                        <Text style={[s.notifTitle, s.notifTitleRead]}>{notif.title}</Text>
                        <Text style={s.notifTime}>{getTimeAgo(notif.created_at)}</Text>
                      </View>
                      <Text style={[s.notifBody, s.notifBodyRead]}>{notif.body}</Text>
                      {notif.detail && <Text style={[s.notifDetail, s.notifDetailRead]}>{notif.detail}</Text>}
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(notif.notification_id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: colors.textMuted, fontSize: 13 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  headerBadge: { backgroundColor: colors.loss, minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  headerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  headerActions: { flexDirection: 'row', gap: 8 },
  markAllBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,255,136,0.08)', alignItems: 'center', justifyContent: 'center' },
  settingsBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  section: { marginBottom: 20 },
  sectionTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  // Notification card
  notifCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  notifUnread: { borderColor: 'rgba(0,255,136,0.15)', backgroundColor: 'rgba(0,255,136,0.02)' },
  notifIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifContent: { flex: 1 },
  notifTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  notifTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', flex: 1 },
  notifTitleRead: { color: colors.textSecondary },
  notifTime: { color: colors.textMuted, fontSize: 10, marginLeft: 8 },
  notifBody: { color: colors.textPrimary, fontSize: 13, lineHeight: 18 },
  notifBodyRead: { color: colors.textSecondary },
  notifDetail: { color: colors.primary, fontSize: 11, marginTop: 4, fontWeight: '600' },
  notifDetailRead: { color: colors.textMuted },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
});
