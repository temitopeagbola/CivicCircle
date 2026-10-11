import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { LIMITS } from '@civiccircle/shared';

import { errorMessage } from '@/lib/api';
import { initials, timeAgo } from '@/lib/format';
import { useAddComment, useComments } from '@/lib/queries';
import { colors, space } from '@/theme';

import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { InlineError } from './ui/States';
import { Text } from './ui/Text';
import { TextField } from './ui/TextField';

export function Comments({ reportId }: { reportId: string }) {
  const comments = useComments(reportId);
  const add = useAddComment(reportId);
  const [body, setBody] = useState('');

  const items = comments.data?.pages.flatMap((p) => p.items) ?? [];
  const submit = () => {
    const text = body.trim();
    if (!text) return;
    add.mutate(text, { onSuccess: () => setBody('') });
  };

  return (
    <View style={styles.wrap}>
      {comments.isPending ? (
        <ActivityIndicator color={colors.primary} />
      ) : comments.isError ? (
        <InlineError message={errorMessage(comments.error)} />
      ) : items.length === 0 ? (
        <Text muted>No comments yet. Seen this too? Add what you know.</Text>
      ) : (
        <View accessibilityRole="list" style={styles.list} testID="comment-list">
          {items.map((c) => (
            <View key={c.id} style={styles.comment} accessibilityRole={'listitem' as never}>
              <View style={styles.avatar}>
                <Text variant="caption" style={styles.avatarText}>
                  {initials(c.author.displayName)}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={styles.byline}>
                  <Text variant="label">{c.author.displayName}</Text>
                  {c.author.role === 'moderator' ? (
                    <Badge label="Moderator" fg="#5B21B6" bg="#EDE9FE" icon="shield-checkmark" />
                  ) : null}
                  <Text variant="caption" muted>
                    {timeAgo(c.createdAt)}
                  </Text>
                </View>
                <Text>{c.body}</Text>
              </View>
            </View>
          ))}
          {comments.hasNextPage ? (
            <Button
              label="Load more comments"
              variant="ghost"
              loading={comments.isFetchingNextPage}
              onPress={() => comments.fetchNextPage()}
            />
          ) : null}
        </View>
      )}

      <View style={styles.composer}>
        <TextField
          label="Add a comment"
          placeholder="e.g. Still there this morning"
          value={body}
          onChangeText={setBody}
          multiline
          maxLengthCounter={LIMITS.commentMax}
          style={{ minHeight: 70 }}
          testID="comment-input"
        />
        {add.isError ? <InlineError message={errorMessage(add.error)} /> : null}
        <Button
          label="Post comment"
          icon="send"
          onPress={submit}
          loading={add.isPending}
          disabled={!body.trim()}
          style={{ alignSelf: 'flex-end' }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  list: { gap: space.lg },
  comment: { flexDirection: 'row', gap: space.md },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '700', color: colors.primaryDark },
  byline: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  composer: { gap: space.sm },
});
