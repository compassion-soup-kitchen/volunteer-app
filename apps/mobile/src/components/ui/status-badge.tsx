import { Badge } from './badge';
import { type IconName } from './icon';
import { type Tone } from './tones';

/** A commitment the volunteer has made to a shift or a training session. */
export type CommitmentStatus = 'SIGNED_UP' | 'REGISTERED' | 'ATTENDED' | 'NO_SHOW';

/**
 * One label and one tone per state, read the same way as the web app's
 * StatusBadge: in motion (signed up, booked) is info, done is success, missed
 * is destructive. Shifts are "signed up" and training is "booked", as on the
 * volunteer's web pages.
 */
const STATUS: Record<CommitmentStatus, { label: string; tone: Tone; icon?: IconName }> = {
  SIGNED_UP: { label: 'Signed up', tone: 'info', icon: 'checkmark' },
  REGISTERED: { label: 'Booked', tone: 'info', icon: 'checkmark' },
  ATTENDED: { label: 'Attended', tone: 'success', icon: 'checkmark' },
  NO_SHOW: { label: 'Missed', tone: 'destructive' },
};

export function StatusBadge({ status }: { status: CommitmentStatus }) {
  const { label, tone, icon } = STATUS[status];
  return <Badge label={label} tone={tone} icon={icon} />;
}
