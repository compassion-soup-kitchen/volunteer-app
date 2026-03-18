"use server";

import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type ServiceAreaWithStats = {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  createdAt: Date;
  _count: { shifts: number; volunteers: number };
};

export async function getServiceAreasWithStats(): Promise<
  ServiceAreaWithStats[]
> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return [];

  const db = getDb();
  return db.serviceArea.findMany({
    orderBy: [{ isArchived: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { shifts: true, volunteers: true },
      },
    },
  });
}

export async function createServiceArea(data: {
  name: string;
  description?: string;
}): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "Not authorised." };
  }

  if (!data.name.trim()) {
    return { error: "Name is required." };
  }

  const db = getDb();

  const existing = await db.serviceArea.findUnique({
    where: { name: data.name.trim() },
  });
  if (existing) {
    return { error: "A service area with this name already exists." };
  }

  try {
    await db.serviceArea.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
      },
    });

    revalidatePath("/staff/service-areas");
    return { success: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

export async function updateServiceArea(
  id: string,
  data: { name?: string; description?: string }
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "Not authorised." };
  }

  if (data.name !== undefined && !data.name.trim()) {
    return { error: "Name is required." };
  }

  const db = getDb();

  if (data.name) {
    const existing = await db.serviceArea.findUnique({
      where: { name: data.name.trim() },
    });
    if (existing && existing.id !== id) {
      return { error: "A service area with this name already exists." };
    }
  }

  try {
    await db.serviceArea.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.description !== undefined && {
          description: data.description.trim() || null,
        }),
      },
    });

    revalidatePath("/staff/service-areas");
    return { success: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

export async function toggleServiceAreaArchive(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "Not authorised." };
  }

  const db = getDb();
  const area = await db.serviceArea.findUnique({ where: { id } });
  if (!area) return { error: "Service area not found." };

  try {
    await db.serviceArea.update({
      where: { id },
      data: { isArchived: !area.isArchived },
    });

    revalidatePath("/staff/service-areas");
    revalidatePath("/shifts");
    return { success: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}
