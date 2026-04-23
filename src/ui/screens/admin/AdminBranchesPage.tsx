import { useEffect, useState } from "react";
import type { Branch } from "../../../domain/governance";
import { runtimeHostAdapter } from "../../../platform/runtimeHostAdapter";
import {
  CatalogManagementPage,
  emptyEditorState,
  type EditorState,
  beginEditEntity
} from "./adminPageHelpers";

export function AdminBranchesPage(props?: { embedded?: boolean }): JSX.Element {
  const embedded = props?.embedded ?? false;
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(emptyEditorState);

  async function loadBranches(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      setBranches(await runtimeHostAdapter.branches.findAll());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load branches.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBranches();
  }, []);

  async function handleSave(): Promise<void> {
    if (!editor.code.trim() || !editor.name.trim()) {
      setError("Branch code and name are required.");
      return;
    }

    try {
      setError(null);
      await runtimeHostAdapter.branches.save({
        id: editor.id ?? crypto.randomUUID(),
        code: editor.code.trim(),
        name: editor.name.trim(),
        isActive: editor.isActive
      });
      setEditor(emptyEditorState);
      await loadBranches();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save branch.");
    }
  }

  async function handleDelete(branch: Branch): Promise<void> {
    if (!window.confirm(`Delete branch ${branch.name}?`)) {
      return;
    }

    try {
      setError(null);
      await runtimeHostAdapter.branches.delete(branch.id);
      if (editor.id === branch.id) {
        setEditor(emptyEditorState);
      }
      await loadBranches();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete branch.");
    }
  }

  return (
    <CatalogManagementPage
      title="Admin - Branches"
      subtitle="Create, update, activate, and remove branch records used throughout correspondence intake."
      singularLabel="Branch"
      items={branches}
      loading={loading}
      error={error}
      editor={editor}
      onEditorChange={(changes) => setEditor((current) => ({ ...current, ...changes }))}
      onReset={() => setEditor(emptyEditorState)}
      onSave={handleSave}
      onEdit={(item) => setEditor(beginEditEntity(item as Branch))}
      onDelete={handleDelete}
      embedded={embedded}
    />
  );
}
