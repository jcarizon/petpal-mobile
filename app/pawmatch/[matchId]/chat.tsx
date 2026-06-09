import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

/** Redirect all PawMatch chats to the unified chat screen. */
export default function PawMatchChatRedirect() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();

  useEffect(() => {
    if (matchId) {
      router.replace({
        pathname: '/chat/[conversationId]',
        params: { conversationId: matchId, kind: 'pawmatch' },
      });
    }
  }, [matchId]);

  return null;
}
