import React, { useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { Input } from "../../components/ui/Input";
import { apiClient } from "../../lib/apiClient";
import { useAuthStore } from "../../lib/auth";
import { Workspace } from "../../types/api";

export function WorkspaceSwitcher() {
  const { workspaces, currentWorkspace, setCurrentWorkspace, setWorkspaces } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;

    setIsCreating(true);
    try {
      const created = await apiClient<Workspace>("/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: newWsName.trim() }),
      });
      const updatedList = [...workspaces, created];
      setWorkspaces(updatedList);
      setCurrentWorkspace(created);
      setNewWsName("");
      setCreateModalOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-surface-light dark:hover:bg-surface-dark border border-border-light dark:border-border-dark text-left transition-colors"
        >
          <div className="truncate">
            <p className="text-xs text-muted-light dark:text-muted-dark font-medium uppercase tracking-wider">
              Workspace
            </p>
            <p className="text-sm font-semibold text-text-light dark:text-text-dark truncate">
              {currentWorkspace?.name || "Select Workspace"}
            </p>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-light dark:text-muted-dark shrink-0 ml-2" />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full left-0 w-full mt-1 bg-bg-light dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark shadow-lg z-30 py-1">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    setCurrentWorkspace(ws);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-text-light dark:text-text-dark hover:bg-surface-light dark:hover:bg-border-dark transition-colors"
                >
                  <span className="truncate">{ws.name}</span>
                  {ws.id === currentWorkspace?.id && (
                    <Check className="w-4 h-4 text-black dark:text-white shrink-0 ml-2" />
                  )}
                </button>
              ))}

              <div className="border-t border-border-light dark:border-border-dark mt-1 pt-1">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setCreateModalOpen(true);
                  }}
                  className="w-full flex items-center px-3 py-2 text-sm text-black dark:text-white hover:bg-surface-light dark:hover:bg-border-dark font-medium gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Workspace
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Workspace"
        description="Workspaces provide isolated environments for documents, chats, and evaluations."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Workspace Name"
            required
            value={newWsName}
            onChange={(e) => setNewWsName(e.target.value)}
            placeholder="e.g. Legal Contracts, Research Papers"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Create
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
