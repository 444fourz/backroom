"use server";

import { revalidatePath } from "next/cache";
import type { MembershipRole } from "@prisma/client";

import { requireCapability } from "@/lib/permissions/guard";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/audit/log";
import { addDocumentSchema } from "@/lib/validation/document.schema";

const DOCUMENTS = "/club/documents";

/**
 * There's no file storage integration in this pass, so a "document" here is
 * a link plus metadata — the same shape the seed data already uses. The
 * uploader (secretary) is always added to visibility so they never lose
 * sight of what they just added.
 */
export async function addDocumentAction(formData: FormData) {
  const { user, active } = await requireCapability("document:manage");

  const parsed = addDocumentSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    fileUrl: formData.get("fileUrl"),
    visibility: formData.getAll("visibility"),
  });
  if (!parsed.success) return;

  const document = await prisma.document.create({
    data: {
      clubId: active.clubId,
      uploadedByUserId: user.id,
      title: parsed.data.title,
      category: parsed.data.category,
      fileUrl: parsed.data.fileUrl,
      visibility: [...new Set<MembershipRole>(["SECRETARY", ...parsed.data.visibility])],
    },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "document.added",
    entityType: "Document",
    entityId: document.id,
    metadata: { title: document.title, category: document.category },
  });

  revalidatePath(DOCUMENTS);
}

export async function removeDocumentAction(formData: FormData) {
  const { user, active } = await requireCapability("document:manage");

  const documentId = formData.get("documentId");
  if (typeof documentId !== "string" || !documentId) return;

  const document = await prisma.document.findFirst({ where: { id: documentId, clubId: active.clubId } });
  if (!document) return;
  // Credential-proof documents are managed through the credential flow, not
  // this general list — deleting one here would silently orphan a Credential.
  if (document.category === "CREDENTIAL_PROOF") return;

  await prisma.document.delete({ where: { id: document.id } });

  await writeAuditLog({
    actorUserId: user.id,
    action: "document.removed",
    entityType: "Document",
    entityId: document.id,
    metadata: { title: document.title },
  });

  revalidatePath(DOCUMENTS);
}
