"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { createApiKey, revokeApiKey, createWebhook, toggleWebhook, deleteWebhook } from "@/lib/actions/developer";
import { toast } from "sonner";
import type { ApiKey, Webhook } from "@/lib/types";

export function DeveloperManager({
  initialApiKeys,
  initialWebhooks,
}: {
  initialApiKeys: ApiKey[];
  initialWebhooks: Webhook[];
}) {
  const [apiKeys, setApiKeys] = useState(initialApiKeys);
  const [webhooks, setWebhooks] = useState(initialWebhooks);

  // API Key state
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  // Webhook state
  const [isWebhookDialogOpen, setIsWebhookDialogOpen] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvent, setNewWebhookEvent] = useState("message.created");

  async function handleCreateApiKey() {
    if (!newKeyName.trim()) return;
    const res = await createApiKey(newKeyName);
    if (res.error) {
      toast.error(res.error);
    } else if (res.token) {
      setGeneratedToken(res.token);
      toast.success("API Key generated");
      // We don't have the full object here without re-fetching, but we can do a hard refresh or just wait for user to reload.
      // For simplicity, let's just let them see the token. They can refresh to see it in the list.
    }
  }

  async function handleRevokeApiKey(id: string) {
    const res = await revokeApiKey(id);
    if (res.error) toast.error(res.error);
    else {
      toast.success("API Key revoked");
      setApiKeys((prev) => prev.map((k) => (k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k)));
    }
  }

  async function handleCreateWebhook() {
    if (!newWebhookUrl.trim()) return;
    const res = await createWebhook(newWebhookUrl, [newWebhookEvent]);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Webhook created. Refresh to see it in the list.");
      setIsWebhookDialogOpen(false);
      setNewWebhookUrl("");
    }
  }

  async function handleToggleWebhook(id: string, active: boolean) {
    const res = await toggleWebhook(id, active);
    if (res.error) toast.error(res.error);
    else {
      toast.success(active ? "Webhook enabled" : "Webhook disabled");
      setWebhooks((prev) => prev.map((w) => (w.id === id ? { ...w, active } : w)));
    }
  }

  async function handleDeleteWebhook(id: string) {
    const res = await deleteWebhook(id);
    if (res.error) toast.error(res.error);
    else {
      toast.success("Webhook deleted");
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    }
  }

  return (
    <div className="space-y-12">
      {/* API Keys Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">API Keys</h2>
          <Button size="sm" onClick={() => setIsApiKeyDialogOpen(true)}>
            Generate New Key
          </Button>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Prefix</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeys.map((key) => (
              <TableRow key={key.id}>
                <TableCell className="font-medium">{key.name}</TableCell>
                <TableCell className="font-mono text-xs">{key.prefix}...</TableCell>
                <TableCell>
                  {key.revoked_at ? (
                    <span className="text-muted-foreground text-xs">Revoked</span>
                  ) : (
                    <span className="text-success text-xs font-medium">Active</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {!key.revoked_at && (
                    <Button variant="destructive" size="sm" onClick={() => handleRevokeApiKey(key.id)}>
                      Revoke
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {apiKeys.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                  No API keys generated yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Dialog open={isApiKeyDialogOpen} onOpenChange={(open) => {
          setIsApiKeyDialogOpen(open);
          if (!open) setGeneratedToken(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate API Key</DialogTitle>
              <DialogDescription>
                Create a new API key for programmatic access.
              </DialogDescription>
            </DialogHeader>
            
            {generatedToken ? (
              <div className="space-y-4">
                <p className="text-sm text-warning font-medium">
                  Copy this key now. You won't be able to see it again!
                </p>
                <div className="p-3 bg-muted rounded-md font-mono text-sm break-all">
                  {generatedToken}
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <Input 
                  placeholder="e.g. Zapier Integration" 
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
            )}

            <DialogFooter>
              {generatedToken ? (
                <Button onClick={() => {
                  setIsApiKeyDialogOpen(false);
                  window.location.reload();
                }}>Done</Button>
              ) : (
                <Button onClick={handleCreateApiKey} disabled={!newKeyName.trim()}>
                  Generate
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      {/* Webhooks Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Webhooks</h2>
          <Button size="sm" onClick={() => setIsWebhookDialogOpen(true)}>
            Add Webhook
          </Button>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>URL</TableHead>
              <TableHead>Events</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {webhooks.map((webhook) => (
              <TableRow key={webhook.id}>
                <TableCell className="font-medium max-w-[200px] truncate" title={webhook.url}>
                  {webhook.url}
                </TableCell>
                <TableCell>
                  <span className="inline-flex bg-muted text-xs px-2 py-0.5 rounded-full">
                    {webhook.events.join(", ")}
                  </span>
                </TableCell>
                <TableCell>
                  <Switch 
                    checked={webhook.active} 
                    onCheckedChange={(c) => handleToggleWebhook(webhook.id, c)} 
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteWebhook(webhook.id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {webhooks.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                  No webhooks configured.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Dialog open={isWebhookDialogOpen} onOpenChange={setIsWebhookDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Webhook</DialogTitle>
              <DialogDescription>
                Receive POST requests to your URL when events occur.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input 
                placeholder="https://your-server.com/webhook" 
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
              />
              <Input 
                disabled
                value={newWebhookEvent}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleCreateWebhook} disabled={!newWebhookUrl.trim()}>
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
