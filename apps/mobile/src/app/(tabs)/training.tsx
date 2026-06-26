import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, View } from 'react-native';

import { TrainingCard } from '@/components/training-card';
import { EmptyState, PageHeader, Screen, SkeletonCard } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { qk } from '@/lib/query-keys';
import { useToast } from '@/providers/toast-provider';
import {
  cancelTrainingRegistration,
  getAvailableTraining,
  registerForTraining,
} from '@/services/training-service';
import type { ActionResult, TrainingSessionWithDetails } from '@/types/models';

export default function TrainingScreen() {
  const toast = useToast();
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: qk.training,
    queryFn: getAvailableTraining,
  });

  function afterMutation(result: ActionResult, successMessage: string) {
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(successMessage);
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

  function handleToggle(session: TrainingSessionWithDetails) {
    if (session.userAttendanceStatus === 'REGISTERED') {
      Alert.alert('Cancel registration?', `Cancel your place at "${session.title}"?`, [
        { text: 'Keep my place', style: 'cancel' },
        { text: 'Cancel', style: 'destructive', onPress: () => cancel.mutate(session.id) },
      ]);
    } else {
      register.mutate(session.id);
    }
  }

  function isPending(id: string) {
    return (register.isPending && register.variables === id) || (cancel.isPending && cancel.variables === id);
  }

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      <PageHeader overline="Ako · Learning" title="Training" subtitle="Build your skills and confidence." illustration="korero" />

      {isLoading ? (
        <View style={{ gap: Spacing.lg }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="school-outline"
          illustration="book"
          tone="navy"
          title="No training scheduled"
          message="New sessions are added regularly — check back soon."
        />
      ) : (
        data.map((session) => (
          <TrainingCard key={session.id} session={session} pending={isPending(session.id)} onToggle={() => handleToggle(session)} />
        ))
      )}
    </Screen>
  );
}
