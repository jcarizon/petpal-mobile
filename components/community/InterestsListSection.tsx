import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Phone, MessageCircle, Users } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { useCommunityStore } from '../../store/communityStore';
import { formatRelativeDate } from '../../lib/utils';

interface InterestsListSectionProps {
  alertId: string;
}

export function InterestsListSection({ alertId }: InterestsListSectionProps) {
  const { interests, fetchInterests, isLoading } = useCommunityStore();
  const list = interests[alertId] ?? [];

  useEffect(() => {
    fetchInterests(alertId);
  }, [alertId, fetchInterests]);

  const handleCall = (phone: string) => {
    const url = `tel:${phone.replace(/\s/g, '')}`;
    Linking.canOpenURL(url).then((ok) => { if (ok) Linking.openURL(url); });
  };

  const handleSms = (phone: string) => {
    const url = `sms:${phone.replace(/\s/g, '')}`;
    Linking.canOpenURL(url).then((ok) => { if (ok) Linking.openURL(url); });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Users size={16} color={Colors.primary} />
        <Text style={styles.headerText}>
          {list.length} {list.length === 1 ? 'person is' : 'people are'} interested
        </Text>
      </View>

      {isLoading && list.length === 0 ? (
        <Text style={styles.empty}>Loading...</Text>
      ) : list.length === 0 ? (
        <Text style={styles.empty}>No one has expressed interest yet.</Text>
      ) : (
        list.map((item) => (
          <View key={item.id} style={styles.item}>
            <View style={styles.itemTop}>
              {item.userAvatarUrl ? (
                <Image source={{ uri: item.userAvatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {(item.userName ?? '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.userName}</Text>
                <Text style={styles.itemTime}>{formatRelativeDate(new Date(item.createdAt))}</Text>
              </View>
            </View>

            {item.message ? (
              <Text style={styles.itemMessage}>{item.message}</Text>
            ) : (
              <Text style={styles.itemNoMessage}>(No message)</Text>
            )}

            {item.userPhone ? (
              <View style={styles.contactRow}>
                <TouchableOpacity style={styles.contactBtn} onPress={() => handleCall(item.userPhone!)}>
                  <Phone size={14} color={Colors.primary} />
                  <Text style={styles.contactBtnText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.contactBtn, styles.contactBtnSms]} onPress={() => handleSms(item.userPhone!)}>
                  <MessageCircle size={14} color={Colors.textSecondary} />
                  <Text style={[styles.contactBtnText, { color: Colors.textSecondary }]}>SMS</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.noPhone}>No contact number added</Text>
            )}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  empty: {
    fontSize: 14,
    color: Colors.textSecondary,
    padding: 16,
    textAlign: 'center',
  },
  item: {
    padding: 14,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.neutral100,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  itemTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  itemMessage: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 19,
    backgroundColor: Colors.neutral50,
    borderRadius: 8,
    padding: 10,
  },
  itemNoMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  contactRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  contactBtnSms: {
    backgroundColor: Colors.neutral50,
    borderColor: Colors.border,
  },
  contactBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  noPhone: {
    fontSize: 12,
    color: Colors.textDisabled,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
