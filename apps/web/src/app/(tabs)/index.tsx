import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  CATEGORIES,
  CATEGORY_LABELS,
  STATUSES,
  STATUS_LABELS,
  type Category,
  type ReportStatus,
} from '@civiccircle/shared';

import { ReportCard } from '@/components/ReportCard';
import { Chip } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { useReports } from '@/lib/queries';
import { categoryIcon, colors, maxContentWidth, space, statusStyle } from '@/theme';

export default function FeedScreen() {
  const [sort, setSort] = useState<'new' | 'top'>('new');
  const [status, setStatus] = useState<ReportStatus | undefined>();
  const [category, setCategory] = useState<Category | undefined>();
  const query = useReports({ sort, status, category });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const filtered = Boolean(status || category);

  const header = (
    <View style={styles.filters}>
      <View style={styles.row} accessibilityLabel="Sort reports">
        <Chip label="Newest" icon="time" selected={sort === 'new'} onPress={() => setSort('new')} />
        <Chip
          label="Most upvoted"
          icon="trending-up"
          selected={sort === 'top'}
          onPress={() => setSort('top')}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <Chip label="All statuses" selected={!status} onPress={() => setStatus(undefined)} />
        {STATUSES.map((s) => (
          <Chip
            key={s}
            label={STATUS_LABELS[s]}
            icon={statusStyle[s].icon}
            selected={status === s}
            onPress={() => setStatus(status === s ? undefined : s)}
          />
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <Chip label="All categories" selected={!category} onPress={() => setCategory(undefined)} />
        {CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={CATEGORY_LABELS[c]}
            icon={categoryIcon[c]}
            selected={category === c}
            onPress={() => setCategory(category === c ? undefined : c)}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(r) => r.id}
      renderItem={({ item }) => <ReportCard report={item} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        query.isPending ? (
          <LoadingState label="Loading reports…" />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : filtered ? (
          <EmptyState
            icon="funnel-outline"
            title="Nothing matches these filters"
            message="Try another status or category."
            action={{
              label: 'Clear filters',
              onPress: () => {
                setStatus(undefined);
                setCategory(undefined);
              },
            }}
          />
        ) : (
          <EmptyState
            icon="megaphone-outline"
            title="No reports yet"
            message="Be the first to report something in your area."
            action={{ label: 'Report an issue', onPress: () => router.push('/new') }}
          />
        )
      }
      ListFooterComponent={
        query.isFetchingNextPage ? (
          <ActivityIndicator color={colors.primary} style={{ margin: space.lg }} />
        ) : items.length > 0 && !query.hasNextPage ? (
          <Text variant="caption" muted style={styles.end}>
            You’re all caught up.
          </Text>
        ) : null
      }
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => query.refetch()}
          tintColor={colors.primary}
        />
      }
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: space.lg,
    gap: space.md,
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
  },
  filters: { gap: space.sm, marginBottom: space.xs },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'nowrap' },
  end: { textAlign: 'center', padding: space.lg },
});
