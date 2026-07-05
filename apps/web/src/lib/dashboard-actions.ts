"use server";

import { connection } from "next/server";
import { auth } from "@/lib/auth";
import {
  getDashboardDataForUser,
  getVolunteerHoursDataForUser,
  type DashboardData,
  type VolunteerHoursData,
} from "@/lib/data/volunteer-dashboard";

export type {
  DashboardData,
  VolunteerHoursData,
  ServiceAreaHours,
  MonthlyHours,
} from "@/lib/data/volunteer-dashboard";

export async function getDashboardData(): Promise<DashboardData | null> {
  await connection();
  const session = await auth();
  if (!session?.user?.id) return null;

  return getDashboardDataForUser(session.user.id);
}

export async function getVolunteerHoursData(): Promise<VolunteerHoursData | null> {
  await connection();
  const session = await auth();
  if (!session?.user?.id) return null;

  return getVolunteerHoursDataForUser(session.user.id);
}
