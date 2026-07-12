"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { requestAccess, acceptInvite, setActiveWorkspace } from "@/lib/actions/workspaces";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";

interface WorkspaceCardProps {
  workspace: { id: string; name: string; slug: string };
  isMember: boolean;
  isInvited: boolean;
  requestStatus?: string;
}

export function WorkspaceCard({ workspace, isMember, isInvited, requestStatus }: WorkspaceCardProps) {
  const [isPending, startTransition] = useTransition();

  function handleRequestAccess() {
    startTransition(async () => {
      const { error } = await requestAccess(workspace.id);
      if (error) {
        toast.error(error);
      } else {
        toast.success("Access requested!");
      }
    });
  }

  function handleAcceptInvite() {
    startTransition(async () => {
      const { error } = await acceptInvite(workspace.id);
      if (error) {
        toast.error(error);
      } else {
        toast.success("Invite accepted!");
        await setActiveWorkspace(workspace.id);
      }
    });
  }

  function handleEnter() {
    startTransition(async () => {
      await setActiveWorkspace(workspace.id);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{workspace.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{workspace.slug}</p>
      </CardContent>
      <CardFooter>
        {isMember ? (
          <Button onClick={handleEnter} disabled={isPending} className="w-full">
            Enter Workspace
          </Button>
        ) : isInvited ? (
          <Button onClick={handleAcceptInvite} disabled={isPending} className="w-full">
            Accept Invite
          </Button>
        ) : requestStatus === "pending" ? (
          <Button variant="secondary" disabled className="w-full">
            Access Requested
          </Button>
        ) : requestStatus === "rejected" ? (
          <Button variant="destructive" disabled className="w-full">
            Request Rejected
          </Button>
        ) : (
          <Button variant="outline" onClick={handleRequestAccess} disabled={isPending} className="w-full">
            Request Access
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
