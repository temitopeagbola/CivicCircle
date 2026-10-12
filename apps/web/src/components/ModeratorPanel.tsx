import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  LIMITS,
  STATUS_LABELS,
  nextStatuses,
  type ReportDTO,
  type ReportStatus,
} from '@civiccircle/shared';

import { errorMessage } from '@/lib/api';
import { useUpdateStatus } from '@/lib/queries';
import { radius, space, statusStyle } from '@/theme';

import { Chip } from './ui/Badge';
import { Button } from './ui/Button';
import { InlineError } from './ui/States';
import { Text } from './ui/Text';
import { TextField } from './ui/TextField';

export function ModeratorPanel({ report }: { report: ReportDTO }) {
  const update = useUpdateStatus(report.id);
  const options = nextStatuses(report.status);
  const [status, setStatus] = useState<ReportStatus | null>(null);
  const [note, setNote] = useState('');
  const [duplicateOf, setDuplicateOf] = useState<string | null>(null);

  const submit = () => {
    if (!status) return;
    update.mutate(
      {
        status,
        note: note.trim() || undefined,
        duplicateOf: status === 'duplicate' ? (duplicateOf ?? undefined) : undefined,
      },
      {
        onSuccess: () => {
          setStatus(null);
          setNote('');
          setDuplicateOf(null);
        },
      },
    );
  };

  return (
    <View style={styles.panel} testID="moderator-panel">
      <Text variant="heading">Moderator: update status</Text>
      <View style={styles.row}>
        {options.map((s) => (
          <Chip
            key={s}
            label={STATUS_LABELS[s]}
            icon={statusStyle[s].icon}
            selected={status === s}
            onPress={() => setStatus(status === s ? null : s)}
          />
        ))}
      </View>
      {status === 'duplicate' && report.duplicates.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <Text variant="label">Duplicate of</Text>
          <View style={styles.row}>
            {report.duplicates.map((d) => (
              <Chip
                key={d.id}
                label={d.summary}
                selected={duplicateOf === d.id}
                onPress={() => setDuplicateOf(duplicateOf === d.id ? null : d.id)}
              />
            ))}
          </View>
        </View>
      ) : null}
      {status ? (
        <TextField
          label="Note for residents (optional)"
          placeholder="e.g. Repair crew booked for Tuesday"
          value={note}
          onChangeText={setNote}
          maxLengthCounter={LIMITS.statusNoteMax}
        />
      ) : null}
      {update.isError ? <InlineError message={errorMessage(update.error)} /> : null}
      <Button
        label={status ? `Mark as ${STATUS_LABELS[status].toLowerCase()}` : 'Choose a new status'}
        onPress={submit}
        disabled={!status}
        loading={update.isPending}
        icon="checkmark"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
