import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { trainingTypeMeta } from '@/components/meta';
import { NextTrainingCard } from '@/components/next-training-card';
import { TrainingCard } from '@/components/training-card';
import { TrainingReadiness } from '@/components/training-readiness';
import { TrainingRecord } from '@/components/training-record';
import { Chip, EmptyState, PageHeader, Screen, SectionHeader, SkeletonCard, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { qk } from '@/lib/query-keys';
import { useToast } from '@/providers/toast-provider';
import {
  cancelTrainingRegistration,
  getTrainingOverview,
  registerForTraining,
} from '@/services/training-service';
import type { ActionResult, TrainingListItem, TrainingType } from '@/types/models';

/** Stable order for the browse filter chips. */
const TYPE_ORDER: TrainingType[] = ['INDUCTION', 'DE_ESCALATION', 'HEALTH_SAFETY', 'OTHER'];

export default function TrainingScreen() {
  const toast = useToast();
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<TrainingType | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: qk.trainingOverview,
    queryFn: getTrainingOverview,
  });

  function afterMutation(result: ActionResult, successMessage: string) {
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(successMessage);
    qc.invalidateQueries({ queryKey: qk.trainingOverview });
    qc.invalidateQueries({ queryKey: qk.training });
    qc.invalidateQueries({ queryKey: qk.dashboard });
  }

  const register = useMutation({
    mutationFn: (id: string) => registerForTraining(id),
    onSuccess: (res) => afterMutation(res, "You're registered — see you there!"),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => cancelTrainingRegistration(id),
    onSuccess: (res) => afterMutation(res, 'Registration cancelled.'),
  });

  function handleCancel(session: TrainingListItem) {
    Alert.alert('Cancel registration?', `Cancel your place at "${session.title}"?`, [
      { text: 'Keep my place', style: 'cancel' },
      { text: 'Cancel', style: 'destructive', onPress: () => cancel.mutate(session.id) },
    ]);
  }

  function isPending(id: string) {
    return (register.isPending && register.variables === id) || (cancel.isPending && cancel.variables === id);
  }

  // Recommended (outstanding core) sits above the open browse list; everything
  // else is the browsable backlog, filterable by type.
  const recommended = useMemo(() => data?.available.filter((s) => s.recommended) ?? [], [data]);
  const browseAll = useMemo(() => data?.available.filter((s) => !s.recommended) ?? [], [data]);
  const browseTypes = useMemo(
    () => TYPE_ORDER.filter((t) => browseAll.some((s) => s.type === t)),
    [browseAll],
  );
  const filteredBrowse = useMemo(
    () => (typeFilter ? browseAll.filter((s) => s.type === typeFilter) : browseAll),
    [browseAll, typeFilter],
  );

  const registered = data?.registered ?? [];
  const completed = data?.completed ?? [];
  const nothingUpcoming = !!data && data.available.length === 0 && registered.length === 0;

  const subtitle = isLoading
    ? 'Building your learning plan.'
    : data?.readiness.fullyTrained
      ? "You're fully trained — ngā mihi nui."
      : 'Grow your skills and confidence.';

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      <PageHeader overline="Ako · Learning" title="Training" subtitle={subtitle} illustration="korero" />

      {isLoading || !data ? (
        <View style={{ gap: Spacing.lg }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <>
          <TrainingReadiness readiness={data.readiness} />

          {/* Your booked sessions — the personal anchor */}
          {registered.length > 0 ? (
            <View style={{ gap: Spacing.lg }}>
              <SectionHeader overline="Kei te haere mai" title="You're booked in" />
              {registered.map((session) => (
                <NextTrainingCard
                  key={session.id}
                  session={session}
                  pending={isPending(session.id)}
                  onCancel={() => handleCancel(session)}
                />
              ))}
            </View>
          ) : null}

          {/* Outstanding core training, surfaced for compliance */}
          {recommended.length > 0 ? (
            <View style={{ gap: Spacing.lg }}>
              <SectionHeader
                overline="Me whai"
                title="Recommended for you"
                divider={registered.length > 0}
              />
              <Text variant="callout" color="textSecondary" style={{ marginTop: -Spacing.sm }}>
                {"Core training to complete before you're fully ready."}
              </Text>
              {recommended.map((session) => (
                <TrainingCard
                  key={session.id}
                  session={session}
                  pending={isPending(session.id)}
                  onRegister={() => register.mutate(session.id)}
                />
              ))}
            </View>
          ) : null}

          {/* Browse everything else */}
          {nothingUpcoming ? (
            <View style={{ gap: Spacing.lg }}>
              <SectionHeader overline="Ngā akoranga" title="Browse training" divider />
              <EmptyState
                icon="school-outline"
                illustration="book"
                tone="navy"
                title="No sessions scheduled"
                message="New training is added regularly — nau mai, check back soon."
              />
            </View>
          ) : browseAll.length > 0 ? (
            <View style={{ gap: Spacing.lg }}>
              <SectionHeader
                overline="Ngā akoranga"
                title="Browse training"
                divider={registered.length > 0 || recommended.length > 0}
              />

              {browseTypes.length > 1 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: Spacing.sm, paddingVertical: 2, paddingRight: Spacing.lg }}>
                  <Chip label="All" selected={typeFilter === null} onPress={() => setTypeFilter(null)} />
                  {browseTypes.map((t) => (
                    <Chip
                      key={t}
                      label={trainingTypeMeta(t).label}
                      selected={typeFilter === t}
                      onPress={() => setTypeFilter(t)}
                    />
                  ))}
                </ScrollView>
              ) : null}

              {filteredBrowse.length === 0 ? (
                <EmptyState
                  icon="school-outline"
                  illustration="book"
                  tone="navy"
                  title="None of those right now"
                  message="Try another type, or check back soon."
                  actionLabel="Show all"
                  onAction={() => setTypeFilter(null)}
                />
              ) : (
                filteredBrowse.map((session) => (
                  <TrainingCard
                    key={session.id}
                    session={session}
                    pending={isPending(session.id)}
                    onRegister={() => register.mutate(session.id)}
                  />
                ))
              )}
            </View>
          ) : null}

          {/* Completed record */}
          {completed.length > 0 ? (
            <View style={{ gap: Spacing.lg }}>
              <SectionHeader overline="Kua oti" title="Your record" divider />
              <TrainingRecord items={completed} />
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}
