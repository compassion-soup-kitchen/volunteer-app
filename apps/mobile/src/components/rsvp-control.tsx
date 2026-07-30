import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Button, Icon, type IconName, Text, TextField, toneColors, type Tone } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  canReply,
  RSVP_LABELS,
  RSVP_NOTE_MAX,
  RSVP_RESPONSES,
  rsvpClosedMessage,
} from '@/lib/events';
import { qk } from '@/lib/query-keys';
import { useToast } from '@/providers/toast-provider';
import { respondToEvent } from '@/services/events-service';
import type { RsvpResponse, VolunteerEvent } from '@/types/models';

/**
 * Each reply carries its own colour and icon, so the chosen one never rests on
 * colour alone: yes is affirmative green, maybe is waiting ochre, no is quiet.
 */
const OPTION_TONE: Record<RsvpResponse, Tone> = {
  GOING: 'success',
  MAYBE: 'warning',
  NOT_GOING: 'neutral',
};

const OPTION_ICON: Record<RsvpResponse, IconName> = {
  GOING: 'checkmark-circle',
  MAYBE: 'help-circle-outline',
  NOT_GOING: 'close-circle-outline',
};

const CONFIRMATIONS: Record<RsvpResponse, string> = {
  GOING: "Lovely — you're on the list.",
  MAYBE: 'Noted as a maybe.',
  NOT_GOING: 'Thanks for letting us know.',
};

export type RsvpControlProps = {
  event: VolunteerEvent;
  /** Offer the note field. Off in dense lists, on in the detail sheet. */
  showNote?: boolean;
};

/**
 * The reply control.
 *
 * Answering is one tap; the note is a second, optional step, because most
 * people have nothing to add and asking for a comment first is how you lose
 * the answer.
 */
export function RsvpControl({ event, showNote = true }: RsvpControlProps) {
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();

  const [chosen, setChosen] = useState<RsvpResponse | null>(event.myResponse);
  const [savedNote, setSavedNote] = useState(event.myNote ?? '');
  const [draftNote, setDraftNote] = useState(event.myNote ?? '');
  const [pending, setPending] = useState<RsvpResponse | null>(null);

  const open = canReply(event);
  const closed = rsvpClosedMessage(event);

  const reply = useMutation({
    mutationFn: ({ response, note }: { response: RsvpResponse; note: string }) =>
      respondToEvent(event.id, response, note),
  });

  async function send(response: RsvpResponse, note: string, successMessage: string) {
    setPending(response);
    const result = await reply.mutateAsync({ response, note });
    setPending(null);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    setChosen(response);
    setSavedNote(note.trim());
    if (process.env.EXPO_OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    toast.success(successMessage);

    // The tallies live on the server (or the mock store) — re-read every
    // surface that shows this event.
    qc.invalidateQueries({ queryKey: qk.event(event.id) });
    qc.invalidateQueries({ queryKey: qk.events });
    qc.invalidateQueries({ queryKey: qk.announcements });
    qc.invalidateQueries({ queryKey: qk.dashboard });
  }

  if (!open) {
    return closed ? (
      <Text variant="caption" color="textTertiary">
        {closed}
      </Text>
    ) : null;
  }

  const noteChanged = draftNote.trim() !== savedNote.trim();
  const busy = pending !== null;

  return (
    <View style={{ gap: Spacing.md }}>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Your reply"
        style={{ flexDirection: 'row', gap: Spacing.sm }}>
        {RSVP_RESPONSES.map((option) => {
          const selected = chosen === option;
          const tint = toneColors(OPTION_TONE[option], colors);
          const fg = selected ? tint.fg : colors.textSecondary;

          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: busy }}
              accessibilityLabel={RSVP_LABELS[option]}
              disabled={busy}
              onPress={() => send(option, draftNote, CONFIRMATIONS[option])}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 48,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                paddingHorizontal: Spacing.sm,
                borderRadius: Radius.md,
                borderCurve: 'continuous',
                borderWidth: 1.5,
                borderColor: selected ? tint.fg : colors.border,
                backgroundColor: selected
                  ? tint.bg
                  : pressed
                    ? colors.surfacePressed
                    : colors.surface,
                opacity: busy && !selected ? 0.6 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}>
              {pending === option ? (
                <ActivityIndicator size="small" color={fg} />
              ) : (
                <Icon name={OPTION_ICON[option]} size={16} raw={fg} />
              )}
              <Text variant="label" style={{ color: fg, flexShrink: 1 }} numberOfLines={1}>
                {RSVP_LABELS[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {showNote && chosen !== null ? (
        <View style={{ gap: Spacing.sm }}>
          <TextField
            label="Anything we should know? (optional)"
            value={draftNote}
            onChangeText={setDraftNote}
            maxLength={RSVP_NOTE_MAX}
            multiline
            editable={!busy}
            placeholder="Dietary needs, bringing tamariki, arriving late…"
          />
          {noteChanged ? (
            <Button
              title="Save note"
              variant="secondary"
              size="md"
              fullWidth={false}
              loading={busy}
              onPress={() => send(chosen, draftNote, 'Note saved.')}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
