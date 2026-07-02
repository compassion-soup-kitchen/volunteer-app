import { Pressable, View } from 'react-native';

import { Chip, Icon, Text, TextField } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ServiceArea } from '@/types/models';

import type { ApplicationDraft } from './draft';

/** Skill options mirrored from the web application form. */
export const SKILL_OPTIONS = [
  'Food preparation',
  'Cooking',
  'Food safety / hygiene',
  'First aid',
  'Driving',
  'Te reo Māori',
  'Community work',
  'Social work',
  'Event planning',
  'Gardening',
  'Administration',
  'IT / Technology',
];

function AreaCard({
  area,
  selected,
  onPress,
}: {
  area: ServiceArea;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={area.name}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        padding: Spacing.lg,
        borderRadius: Radius.lg,
        borderCurve: 'continuous',
        borderWidth: 1.5,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: pressed ? colors.surfacePressed : colors.surface,
      })}>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text variant="subheading">{area.name}</Text>
          {area.maori ? (
            <Text variant="caption" color="primary">
              {area.maori}
            </Text>
          ) : null}
        </View>
        {area.description ? (
          <Text variant="caption" color="textSecondary">
            {area.description}
          </Text>
        ) : null}
      </View>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: selected ? 0 : 1.5,
          borderColor: colors.borderStrong,
          backgroundColor: selected ? colors.primary : 'transparent',
        }}>
        {selected ? <Icon name="checkmark" size={14} raw={colors.primaryForeground} /> : null}
      </View>
    </Pressable>
  );
}

export function StepInterests({
  draft,
  patch,
  errors,
  serviceAreas,
}: {
  draft: ApplicationDraft;
  patch: (update: Partial<ApplicationDraft>) => void;
  errors: Record<string, string>;
  serviceAreas: ServiceArea[];
}) {
  function toggleArea(id: string) {
    patch({
      serviceAreaIds: draft.serviceAreaIds.includes(id)
        ? draft.serviceAreaIds.filter((s) => s !== id)
        : [...draft.serviceAreaIds, id],
    });
  }

  function toggleSkill(skill: string) {
    patch({
      skills: draft.skills.includes(skill)
        ? draft.skills.filter((s) => s !== skill)
        : [...draft.skills, skill],
    });
  }

  return (
    <View style={{ gap: Spacing.xxl }}>
      <View style={{ gap: Spacing.md }}>
        <View style={{ gap: 2 }}>
          <Text variant="subheading">Where would you like to help?</Text>
          <Text variant="caption" color="textTertiary">
            Pick as many as you like - you can volunteer across areas.
          </Text>
        </View>
        {errors.interests ? (
          <Text variant="caption" color="destructive" role="alert">
            {errors.interests}
          </Text>
        ) : null}
        <View style={{ gap: Spacing.sm }}>
          {serviceAreas.map((area) => (
            <AreaCard
              key={area.id}
              area={area}
              selected={draft.serviceAreaIds.includes(area.id)}
              onPress={() => toggleArea(area.id)}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: Spacing.md }}>
        <View style={{ gap: 2 }}>
          <Text variant="subheading">Any skills you&apos;d like to share?</Text>
          <Text variant="caption" color="textTertiary">
            Optional - all help is welcome, experienced or not.
          </Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {SKILL_OPTIONS.map((skill) => (
            <Chip
              key={skill}
              label={skill}
              selected={draft.skills.includes(skill)}
              onPress={() => toggleSkill(skill)}
            />
          ))}
        </View>
      </View>

      <TextField
        label="About you"
        value={draft.bio}
        onChangeText={(bio) => patch({ bio })}
        placeholder="Why you'd like to volunteer, any experience, or anything else you'd like us to know…"
        multiline
        hint="Optional"
      />
    </View>
  );
}
