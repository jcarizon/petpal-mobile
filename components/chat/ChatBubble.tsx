/**
 * Unified chat bubble used in both community and PawMatch conversations.
 */
import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Video, FileText, Play } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { UserAvatarBox } from '../ui/UserAvatarBox';
import { formatRelativeDate } from '../../lib/utils';

const W = Dimensions.get('window').width;
const MAX_BUBBLE = W * 0.72;

export interface ChatBubbleMessage {
  id: string;
  content: string;
  isMine: boolean;
  senderName?: string;
  senderAvatarUrl?: string;
  createdAt: string;
  /** True when the previous message was from the same sender */
  grouped?: boolean;
  /** True when this is the last message in a sender group */
  tail?: boolean;
  isRead?: boolean;
  isLast?: boolean;
}

interface Props {
  msg: ChatBubbleMessage;
  onImagePress?: (uri: string) => void;
}

// ── Content parsers ────────────────────────────────────────────────────────────

function parseContent(content: string) {
  const imgMatch  = content.match(/^\[img\](https?:\/\/\S+)(\n([\s\S]*))?$/);
  const vidMatch  = content.match(/^\[vid:([^\]]+)\](https?:\/\/\S+)?(\n([\s\S]*))?$/);
  const fileMatch = content.match(/^\[file:([^\]]+)\]\S+(\n([\s\S]*))?$/);
  return { imgMatch, vidMatch, fileMatch };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChatBubble({ msg, onImagePress }: Props) {
  const { isMine, content, senderName, senderAvatarUrl, createdAt, grouped, tail, isRead, isLast } = msg;
  const { imgMatch, vidMatch, fileMatch } = parseContent(content);

  // Connecting corner goes flat (4) when there is another bubble from same sender after this.
  // Grouped top corner goes tighter (6) when the previous bubble was same sender.
  const bubbleRadius = {
    borderTopLeftRadius:     isMine ? 18 : (grouped ? 6 : 18),
    borderTopRightRadius:    isMine ? (grouped ? 6 : 18) : 18,
    borderBottomLeftRadius:  isMine ? 18 : (tail ? 18 : 4),
    borderBottomRightRadius: isMine ? (tail ? 18 : 4) : 18,
  };

  const bodyText = imgMatch?.[3] || vidMatch?.[4] || fileMatch?.[3] || null;

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowOther, grouped && styles.rowGrouped]}>
      {/* Other-side avatar — shown on the last bubble of a sender group */}
      {!isMine && (
        <View style={styles.avatarCol}>
          {tail ? (
            <UserAvatarBox avatarUrl={senderAvatarUrl} name={senderName} size={32} />
          ) : (
            <View style={styles.avatarSpacer} />
          )}
        </View>
      )}

      <View style={[styles.col, isMine ? styles.colMine : styles.colOther]}>
        {/* Sender name — only for the first bubble in a group on the other side */}
        {!isMine && !grouped && senderName && (
          <Text style={styles.senderName}>{senderName}</Text>
        )}

        {/* Bubble */}
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther, bubbleRadius]}>

          {/* Image */}
          {imgMatch && (
            <TouchableOpacity
              onPress={() => onImagePress?.(imgMatch[1])}
              activeOpacity={0.92}
            >
              <Image
                source={{ uri: imgMatch[1] }}
                style={[styles.attachImage, bubbleRadius]}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}

          {/* Video chip */}
          {vidMatch && (
            <View style={[styles.videoChip, isMine ? styles.videoChipMine : styles.videoChipOther]}>
              <View style={styles.videoPlayBtn}>
                <Play size={14} color="#fff" fill="#fff" />
              </View>
              <Text style={[styles.videoChipText, isMine && { color: Colors.surface }]} numberOfLines={1}>
                {vidMatch[1]}
              </Text>
              <Video size={14} color={isMine ? 'rgba(255,255,255,0.7)' : Colors.neutral400} />
            </View>
          )}

          {/* File chip */}
          {fileMatch && (
            <View style={[styles.fileChip, isMine ? styles.fileChipMine : styles.fileChipOther]}>
              <FileText size={16} color={isMine ? Colors.surface : Colors.primary} />
              <Text style={[styles.fileChipText, isMine && { color: Colors.surface }]} numberOfLines={1}>
                {fileMatch[1]}
              </Text>
            </View>
          )}

          {/* Text body */}
          {!imgMatch && !vidMatch && !fileMatch && (
            <Text style={[styles.text, isMine && styles.textMine]}>{content}</Text>
          )}
          {bodyText ? (
            <Text style={[styles.text, isMine && styles.textMine, { marginTop: 6 }]}>{bodyText}</Text>
          ) : null}

          {/* Timestamp inside bubble */}
          <Text style={[styles.time, isMine ? styles.timeMine : styles.timeOther]}>
            {formatRelativeDate(new Date(createdAt))}
            {isMine && isLast && (
              <Text style={styles.readIndicator}>{isRead ? '  ✓✓' : '  ✓'}</Text>
            )}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 2, paddingHorizontal: 12 },
  rowMine: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  rowGrouped: { marginBottom: 1 },

  avatarCol: { width: 36, marginRight: 6, justifyContent: 'flex-end' },
  avatarSpacer: { width: 32 },

  col: { maxWidth: MAX_BUBBLE },
  colMine: { alignItems: 'flex-end' },
  colOther: { alignItems: 'flex-start' },

  senderName: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, marginBottom: 3, marginLeft: 4 },

  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  bubbleMine: {
    backgroundColor: Colors.primary,
  },
  bubbleOther: {
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    shadowColor: Colors.neutral900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },

  text: { fontSize: 15, color: Colors.textPrimary, lineHeight: 21 },
  textMine: { color: '#fff' },

  attachImage: {
    width: MAX_BUBBLE - 28,
    height: Math.round((MAX_BUBBLE - 28) * 0.75),
    borderRadius: 10,
    marginBottom: 2,
  },

  videoChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
    marginBottom: 2,
  },
  videoChipMine: { backgroundColor: 'rgba(255,255,255,0.15)' },
  videoChipOther: {},
  videoPlayBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  videoChipText: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textPrimary },

  fileChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
    marginBottom: 2,
  },
  fileChipMine: { backgroundColor: 'rgba(255,255,255,0.15)' },
  fileChipOther: {},
  fileChipText: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textPrimary },

  time: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  timeMine: { color: 'rgba(255,255,255,0.65)' },
  timeOther: { color: Colors.neutral400 },
  readIndicator: { color: 'rgba(255,255,255,0.65)', fontSize: 10 },
});
