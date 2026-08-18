import { requireCapability } from "@/lib/permissions/guard";
import { roleLabel } from "@/lib/permissions/policies";
import { listMembersForClub, listTeamsForClub } from "@/lib/data/club";
import { listPendingInvites } from "@/lib/data/invites";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/shared/row-actions";
import { ActionToast } from "@/components/shared/action-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  changeRoleAction,
  createInviteAction,
  removeMembershipAction,
  renameUserAction,
  revokeInviteAction,
} from "./actions";
import {
  ChangeRoleForm,
  CopyInviteLink,
  InviteForm,
  RemoveAccessForm,
  RenameForm,
} from "./member-forms";
import { InviteDialog, RevokeInviteButton } from "./invite-controls";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { user, active } = await requireCapability("club:manage");
  const [members, teams, invites] = await Promise.all([
    listMembersForClub(active),
    listTeamsForClub(active),
    listPendingInvites(active),
  ]);
  const { error } = await searchParams;

  const teamOptions = teams.map((team) => ({ id: team.id, name: team.name }));
  const secretaryCount = members.filter(
    (member) => member.role === "SECRETARY" && member.status === "ACTIVE",
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <ActionToast param="ok" message="Saved" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground">
            Everyone with access to the club, and what each of them can see.
          </p>
        </div>
        <InviteDialog form={<InviteForm action={createInviteAction} teams={teamOptions} />} />
      </div>

      {error ? (
        <div className="rounded-sm border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="w-10 text-right">
                  <span className="sr-only">Manage</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const isSelf = member.userId === user.id;
                const isLastSecretary = member.role === "SECRETARY" && secretaryCount <= 1;

                return (
                  <TableRow key={member.id} className="group/row">
                    <TableCell className="font-medium">
                      {member.user.name}
                      {isSelf ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">you</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{member.user.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{roleLabel(member.role)}</Badge>
                    </TableCell>
                    <TableCell>{member.team?.name ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        label={member.user.name}
                        // Your own role is never editable — that's what stops a
                        // secretary granting themselves medical or financial sight.
                        disabledReason={
                          isSelf
                            ? "You can't change your own role or access"
                            : undefined
                        }
                        actions={[
                          {
                            label: "Change role",
                            dialogTitle: `Change ${member.user.name}'s role`,
                            dialogDescription:
                              "What they can see changes immediately. This is recorded in the audit log.",
                            form: (
                              <ChangeRoleForm
                                action={changeRoleAction}
                                membershipId={member.id}
                                currentRole={member.role}
                                currentTeamId={member.teamId}
                                teams={teamOptions}
                              />
                            ),
                          },
                          {
                            label: "Correct name",
                            dialogTitle: "Correct name",
                            form: (
                              <RenameForm
                                action={renameUserAction}
                                userId={member.userId}
                                currentName={member.user.name}
                              />
                            ),
                          },
                          ...(isLastSecretary
                            ? []
                            : [
                                {
                                  label: "Remove access",
                                  destructive: true,
                                  dialogTitle: `Remove ${member.user.name}?`,
                                  form: (
                                    <RemoveAccessForm
                                      action={removeMembershipAction}
                                      membershipId={member.id}
                                      name={member.user.name}
                                    />
                                  ),
                                },
                              ]),
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {invites.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending invites</CardTitle>
            <CardDescription>
              Email delivery isn&apos;t wired up yet — copy each link and send it yourself.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-40 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id} className="group/row">
                    <TableCell className="font-medium">{invite.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{roleLabel(invite.role)}</Badge>
                      {invite.team ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {invite.team.name}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invite.expiresAt.toLocaleDateString("en-GB")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <CopyInviteLink token={invite.token} />
                        <RevokeInviteButton action={revokeInviteAction} inviteId={invite.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
