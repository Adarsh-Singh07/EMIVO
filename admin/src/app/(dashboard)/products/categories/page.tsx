"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Image as ImageIcon, Loader2, Edit } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  icon?: string;
  keywords?: string;
  position: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Partial<Category>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Category[]>("/store/categories");
      setCategories(data);
    } catch (err) {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCat({ name: "", slug: "", position: 0, icon: "", keywords: "", image_url: "" });
    setModalOpen(true);
  };

  const handleOpenEdit = (c: Category) => {
    setEditingCat({ ...c });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCat.id) {
        await apiClient.put(`/products/categories/${editingCat.id}`, editingCat);
        toast.success("Category updated");
      } else {
        await apiClient.post("/products/categories", editingCat);
        toast.success("Category created");
      }
      setModalOpen(false);
      loadCategories();
    } catch (err) {
      toast.error("Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);
      const presign = await apiClient.post<{ upload_url: string; public_url: string }>("/media/presign", {
        filename: file.name,
        content_type: file.type,
        size_bytes: file.size,
      });
      const put = await fetch(presign.upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("Upload failed");
      
      setEditingCat(prev => ({ ...prev, image_url: presign.public_url }));
      toast.success("Image uploaded");
    } catch (err) {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await apiClient.delete(`/products/categories/${categoryId}`);
      toast.success("Category deleted");
      loadCategories();
    } catch (err) {
      toast.error("Failed to delete category");
    }
  };

  const inputClass = "w-full h-11 px-4 rounded-xl bg-white border border-neutral-200 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500";
  const labelClass = "block text-sm font-semibold text-neutral-700 mb-1.5";

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Categories & Brands</h1>
          <p className="mt-1 text-sm text-neutral-500">Manage your product categories and brand logos.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-neutral-800"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="px-6 py-4 font-medium text-neutral-500 w-20">Image</th>
              <th className="px-6 py-4 font-medium text-neutral-500">Name</th>
              <th className="px-6 py-4 font-medium text-neutral-500">Slug</th>
              <th className="px-6 py-4 font-medium text-neutral-500">Icon</th>
              <th className="px-6 py-4 font-medium text-neutral-500">Keywords</th>
              <th className="px-6 py-4 font-medium text-neutral-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {categories.map((c) => (
              <tr key={c.id} className="hover:bg-neutral-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="h-10 w-10 rounded-xl border border-neutral-200 bg-neutral-100 overflow-hidden flex items-center justify-center">
                    {c.image_url ? (
                      <img src={c.image_url} alt={c.name} className="h-full w-full object-contain" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-neutral-400" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 font-medium text-neutral-900">{c.name}</td>
                <td className="px-6 py-4 text-neutral-500">{c.slug}</td>
                <td className="px-6 py-4 text-neutral-500">{c.icon || "-"}</td>
                <td className="px-6 py-4 text-neutral-500">{c.keywords || "-"}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleOpenEdit(c)} className="p-2 text-neutral-400 hover:text-blue-600 transition-colors mr-2">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-2 text-neutral-400 hover:text-red-600 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-neutral-500">No categories found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6">{editingCat.id ? "Edit Category" : "Add Category"}</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Name</label>
                  <input className={inputClass} value={editingCat.name || ""} onChange={e => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                    setEditingCat(prev => ({ ...prev, name, slug: prev.id ? prev.slug : slug }));
                  }} required />
                </div>
                <div>
                  <label className={labelClass}>Slug</label>
                  <input className={inputClass} value={editingCat.slug || ""} onChange={e => setEditingCat(prev => ({ ...prev, slug: e.target.value }))} required />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Icon Name (e.g. Smartphone)</label>
                  <input className={inputClass} value={editingCat.icon || ""} onChange={e => setEditingCat(prev => ({ ...prev, icon: e.target.value }))} />
                </div>
                
                <div>
                  <label className={labelClass}>Position / Priority (0 is first)</label>
                  <input className={inputClass} type="number" value={editingCat.position || 0} onChange={(e) => setEditingCat(prev => ({ ...prev, position: parseInt(e.target.value) || 0 }))} />
                </div>

                <div>
                  <label className={labelClass}>Keywords (comma separated)</label>
                  <input className={inputClass} value={editingCat.keywords || ""} onChange={e => setEditingCat(prev => ({ ...prev, keywords: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Image URL (Overrides Icon)</label>
                <div className="flex gap-2">
                  <input className={inputClass} value={editingCat.image_url || ""} onChange={e => setEditingCat(prev => ({ ...prev, image_url: e.target.value }))} placeholder="https://..." />
                  <label className="shrink-0 flex items-center justify-center h-11 px-4 bg-neutral-100 border border-neutral-200 rounded-xl text-sm font-semibold cursor-pointer hover:bg-neutral-200">
                    {uploading ? "..." : "Upload"}
                    <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }} />
                  </label>
                </div>
                {editingCat.image_url && (
                  <div className="mt-3 relative inline-block">
                    <img src={editingCat.image_url} alt="Preview" className="h-16 w-16 object-contain rounded-lg border border-neutral-200 bg-neutral-50" />
                    <button type="button" onClick={() => setEditingCat(prev => ({ ...prev, image_url: "" }))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center shadow">
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 font-semibold text-white hover:from-amber-600 hover:to-orange-700 disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingCat.id ? "Save Changes" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
