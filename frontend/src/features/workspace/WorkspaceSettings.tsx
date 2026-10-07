import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { Input } from "../../components/ui/Input";
import { apiClient } from "../../lib/apiClient";
import { useAuthStore } from "../../lib/auth";
import { Workspace } from "../../types/api";

export function WorkspaceSettings() {
  const navigate = useNavigate();
  const { currentWorkspace, workspaces, setWorkspaces, setCurrentWorkspace } = useAuthStore();

  const [name, setName] = useState(currentWorkspace?.name || "");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  if (!currentWorkspace) return null;

  const isOwner = currentWorkspace.role === "owner";

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsUpdating(true);
    try {
      const updated = await apiClient<Workspace>(`/workspaces/${currentWorkspace.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim() }),
      });
      const updatedList = workspaces.map((w) => (w.id === updated.id ? updated : w));
      setWorkspaces(updatedList);
      setCurrentWorkspace(updated);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      await apiClient(`/workspaces/${currentWorkspace.id}/invites`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail.trim(), role: "member" }),
      });
      setInviteSuccess(`Successfully invited ${inviteEmail}`);
      setInviteEmail("");
    } catch (err: any) {
      alert(err.detail || "Failed to invite member");
    }
  };

  const handleDeleteWorkspace = async () => {
    if (confirmText !== currentWorkspace.name) return;

    try {
      await apiClient(`/workspaces/${currentWorkspace.id}`, {
        method: "DELETE",
      });
      const remaining = workspaces.filter((w) => w.id !== currentWorkspace.id);
      setWorkspaces(remaining);
      if (remaining.length > 0) {
        setCurrentWorkspace(remaining[0]);
        navigate("/library");
      } else {
        navigate("/login");
      }
    } catch (err: any) {
      alert(err.detail || "Failed to delete workspace");
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto w-full">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        <div>
          <h2 className="text-xl font-bold text-text-light dark:text-text-dark">Workspace Settings</h2>
          <p className="mt-1 text-xs sm:text-sm text-muted-light dark:text-muted-dark">
            Manage your workspace preferences, members, and isolation boundary.
          </p>
        </div>

        {/* General Settings */}
        <div className="p-4 sm:p-6 rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark space-y-4">
          <h3 className="text-base font-semibold text-text-light dark:text-text-dark">General</h3>
          <form onSubmit={handleRename} className="space-y-4">
            <Input
              label="Workspace Name"
              value={name}
              disabled={!isOwner}
              onChange={(e) => setName(e.target.value)}
            />
            {isOwner && (
              <Button type="submit" isLoading={isUpdating}>
                Save changes
              </Button>
            )}
          </form>
        </div>

        {/* Invites */}
        {isOwner && (
          <div className="p-4 sm:p-6 rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark space-y-4">
            <h3 className="text-base font-semibold text-text-light dark:text-text-dark">Invite Members</h3>
            <p className="text-xs sm:text-sm text-muted-light dark:text-muted-dark">
              Invite colleagues to collaborate and chat with documents in this workspace.
            </p>

            {inviteSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-sm rounded-lg border border-emerald-200 dark:border-emerald-800">
                {inviteSuccess}
              </div>
            )}

            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="shrink-0">Invite</Button>
            </form>
          </div>
        )}

      {/* Danger Zone */}
      {isOwner && (
        <div className="p-6 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 space-y-4">
          <h3 className="text-base font-semibold text-red-600 dark:text-red-400">Danger Zone</h3>
          <p className="text-sm text-muted-light dark:text-muted-dark">
            Permanently delete this workspace and all associated documents, chunk embeddings, chat history, and evaluation runs. This action cannot be undone.
          </p>
          <Button variant="danger" onClick={() => setDeleteModalOpen(true)}>
            Delete Workspace
          </Button>
        </div>
      )}

      <Dialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Workspace"
        description={`To confirm, type "${currentWorkspace.name}" in the field below.`}
      >
        <div className="space-y-4">
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={currentWorkspace.name}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={confirmText !== currentWorkspace.name}
              onClick={handleDeleteWorkspace}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Dialog>
      </div>
    </div>
  );
}
