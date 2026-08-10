import { FileText } from "lucide-react";

import { requireCapability } from "@/lib/permissions/guard";
import { listDocumentsForClub } from "@/lib/data/club";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
        <Button variant="outline" disabled>
          Upload document
        </Button>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell className="font-medium">{document.title}</TableCell>
                    <TableCell className="capitalize">{document.category.toLowerCase().replaceAll("_", " ")}</TableCell>
                    <TableCell>{document.uploadedBy.name}</TableCell>
                    <TableCell>{document.createdAt.toLocaleDateString("en-GB")}</TableCell>
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
