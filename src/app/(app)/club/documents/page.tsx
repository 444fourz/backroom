import { FileText } from "lucide-react";

import { requireCapability } from "@/lib/permissions/guard";
import { listDocumentsForClub } from "@/lib/data/club";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { addDocumentAction, removeDocumentAction } from "./actions";
import { AddDocumentDialog, RemoveDocumentButton } from "./document-controls";

export default async function DocumentsPage() {
  const { active } = await requireCapability("document:manage");
  const documents = await listDocumentsForClub(active);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground">Policies, consent forms and proof of credentials.</p>
        </div>
        <AddDocumentDialog action={addDocumentAction} />
      </div>

      {documents.length === 0 ? (
        <EmptyState icon={FileText} title="No documents yet" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Uploaded by</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-10 text-right">
                    <span className="sr-only">Remove</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell className="font-medium">
                      <a
                        href={document.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {document.title}
                      </a>
                    </TableCell>
                    <TableCell className="capitalize">{document.category.toLowerCase().replaceAll("_", " ")}</TableCell>
                    <TableCell>{document.uploadedBy.name}</TableCell>
                    <TableCell>{document.createdAt.toLocaleDateString("en-GB")}</TableCell>
                    <TableCell className="text-right">
                      {document.category === "CREDENTIAL_PROOF" ? null : (
                        <RemoveDocumentButton action={removeDocumentAction} documentId={document.id} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
