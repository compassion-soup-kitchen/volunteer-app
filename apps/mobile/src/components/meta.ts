/** Visual metadata (icon + accent tone) for service areas and training types. */

import { type IconName } from '@/components/ui/icon';
import { type Tone } from '@/components/ui/tones';
import type { TrainingType } from '@/types/models';

export function serviceAreaMeta(id: string): { icon: IconName; tone: Tone } {
  switch (id) {
    case 'sa-kitchen':
      return { icon: 'restaurant', tone: 'brand' };
    case 'sa-dining':
      return { icon: 'people', tone: 'navy' };
    case 'sa-rescue':
      return { icon: 'cube', tone: 'warning' };
    case 'sa-garden':
      return { icon: 'leaf', tone: 'success' };
    case 'sa-welcome':
      return { icon: 'hand-left', tone: 'navy' };
    default:
      return { icon: 'calendar', tone: 'neutral' };
  }
}

/**
 * Turns an unrecognised key into something readable — 'FIRST_AID' → 'First aid'
 * — so a training type staff added in the web app still reads properly here.
 */
function labelFromKey(key: string): string {
  const words = key.replace(/_/g, ' ').trim().toLowerCase();
  if (!words) return 'Training';
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function trainingTypeMeta(type: TrainingType): { label: string; tone: Tone; icon: IconName } {
  switch (type) {
    case 'INDUCTION':
      return { label: 'Induction', tone: 'navy', icon: 'compass' };
    case 'DE_ESCALATION':
      return { label: 'De-escalation', tone: 'warning', icon: 'shield-checkmark' };
    case 'HEALTH_SAFETY':
      return { label: 'Health & safety', tone: 'success', icon: 'medkit' };
    case 'OTHER':
      return { label: 'Workshop', tone: 'brand', icon: 'book' };
    default:
      // A type staff created since this build shipped.
      return { label: labelFromKey(type), tone: 'neutral', icon: 'book' };
  }
}
