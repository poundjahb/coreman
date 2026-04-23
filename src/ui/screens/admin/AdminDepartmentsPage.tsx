import { useEffect, useState } from "react";
import type { Department } from "../../../domain/governance";
import { runtimeHostAdapter } from "../../../platform/runtimeHostAdapter";
import {
  CatalogManagementPage,
  emptyEditorState,
  type EditorState,
  beginEditEntity
} from "./adminPageHelpers";

export function AdminDepartmentsPage(props?: { embedded?: boolean }): JSX.Element {
  const embedded = props?.embedded ?? false;
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(emptyEditorState);

  async function loadDepartments(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      setDepartments(await runtimeHostAdapter.departments.findAll());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load departments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDepartments();
  }, []);

  async function handleSave(): Promise<void> {
    if (!editor.code.trim() || !editor.name.trim()) {
      setError("Department code and name are required.");
      return;
    }

    await runtimeHostAdapter.departments.save({
      id: editor.id ?? crypto.randomUUID(),
      code: editor.code.trim(),
      name: editor.name.trim(),
      isActive: editor.isActive
    });
    setEditor(emptyEditorState);
    await loadDepartments();
  }

  async function handleDelete(department: Department): Promise<void> {
    if (!window.confirm(`Delete department ${department.name}?`)) {
      return;
    }

    await runtimeHostAdapter.departments.delete(department.id);
    if (editor.id === department.id) {
      setEditor(emptyEditorState);
    }
    await loadDepartments();
  }

  return (
    <CatalogManagementPage
      title="Admin - Departments"
      subtitle="Create, update, activate, and remove department records used for routing and reporting."
      singularLabel="Department"
      items={departments}
      loading={loading}
      error={error}
      editor={editor}
      onEditorChange={(changes) => setEditor((current) => ({ ...current, ...changes }))}
      onReset={() => setEditor(emptyEditorState)}
      onSave={handleSave}
      onEdit={(item) => setEditor(beginEditEntity(item as Department))}
      onDelete={handleDelete}
      embedded={embedded}
    />
  );
}
