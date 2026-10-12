/**
 * Taking shifts off the roster on the kitchen's side - a day closed, a
 * repeating shift stopped - and telling whoever had signed up.
 *
 * Split in two because the delete belongs inside the caller's transaction but
 * the push must wait until it commits: `removeShifts` returns who to tell, and
 * `notifyRemovedShifts` is handed that list from `after()`.
 */

import type { Prisma } from "@prisma/client";

import { formatShiftDay } from "@/lib/shift-notifications";
import { sendPushToUsers } from "@/lib/push";

export type RemovedShift = {
  id: string;
  date: Date;
  serviceAreaName: string;
  /**
   * App users who were still expected on it - the ones a push can reach.
   * Offline volunteers are left out: staff ring them, so they're never
   * counted as "told".
   */
  userIds: string[];
};

/**
 * Deletes the shifts (their signups and offers cascade) and reports who was
 * signed up to each. Attended or no-show records are the caller's to guard
 * against: this deletes whatever it is given.
 */
export async function removeShifts(
  tx: Prisma.TransactionClient,
  shiftIds: string[]
): Promise<RemovedShift[]> {
  if (shiftIds.length === 0) return [];

  const shifts = await tx.shift.findMany({
    where: { id: { in: shiftIds } },
    select: {
      id: true,
      date: true,
      serviceArea: { select: { name: true } },
      signups: {
        where: { status: "SIGNED_UP", volunteer: { user: { isOffline: false } } },
        select: { volunteer: { select: { userId: true } } },
      },
    },
  });

  await tx.shift.deleteMany({ where: { id: { in: shiftIds } } });

  return shifts.map((shift) => ({
    id: shift.id,
    date: shift.date,
    serviceAreaName: shift.serviceArea.name,
    userIds: shift.signups.map((signup) => signup.volunteer.userId),
  }));
}

/** One push per removed shift to the people who were on it. */
export async function notifyRemovedShifts(
  removed: RemovedShift[],
  message: (shift: RemovedShift & { dayLabel: string }) => {
    title: string;
    body: string;
  }
): Promise<void> {
  for (const shift of removed) {
    if (shift.userIds.length === 0) continue;
    const { title, body } = message({
      ...shift,
      dayLabel: formatShiftDay(shift.date),
    });
    await sendPushToUsers(shift.userIds, {
      title,
      body,
      data: { url: "/schedule" },
    });
  }
}
