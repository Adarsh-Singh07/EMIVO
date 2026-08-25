"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";
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
  const [uploading, setUploading] = useState<string | null>(null);

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

  const handleCreate = async () => {
    const name = window.prompt("New Category Name:");
    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    try {
      await apiClient.post("/products/categories", { name, slug });
      toast.success("Category created");
      loadCategories();
    } catch (err) {
      toast.error("Failed to create category");
    }
  };


  const handleUpdate = async (categoryId: string, field: string, value: string) => {
    try {
      await apiClient.put(`/products/categories/${categoryId}`, { [field]: value });
      toast.success("Updated");
      loadCategories();
    } catch (err) {
      toast.error("Failed to update");
    }
  };

  const handleImageUpload = async (categoryId: string, file: File) => {
    try {
      setUploading(categoryId);
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
      
      await apiClient.put(`/products/categories/${categoryId}`, { image_url: presign.public_url });
      toast.success("Image uploaded");
      loadCategories();
    } catch (err) {
      toast.error("Failed to upload image");
    } finally {
      setUploading(null);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Categories & Brands</h1>
          <p className="mt-1 text-sm text-neutral-500">Manage your product categories and brand logos.</p>
        </div>
        <button
          onClick={handleCreate}
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
              <th className="px-6 py-4 font-medium text-neutral-500">Image</th>
              <th className="px-6 py-4 font-medium text-neutral-500">Name</th>
              <th className="px-6 py-4 font-medium text-neutral-500">Icon</th>
              <th className="px-6 py-4 font-medium text-neutral-500">Keywords</th>
              <th className="px-6 py-4 font-medium text-neutral-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {categories.map((c) => (
              <tr key={c.id} className="hover:bg-neutral-50/50 transition-colors">
                <td className="px-6 py-4">
                  <label className="cursor-pointer group relative block h-12 w-12 rounded-xl border border-neutral-200 bg-neutral-100 overflow-hidden">
                    {c.image_url ? (
                      <img src={c.image_url} alt={c.name} className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-neutral-400 group-hover:text-neutral-600">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                    {uploading === c.id && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-neutral-900" />
                      </div>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleImageUpload(c.id, e.target.files[0]);
                      }}
                    />
                  </label>
                </td>
                <td className="px-6 py-4 font-medium text-neutral-900">{c.name}</td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    defaultValue={c.icon || ""}
                    onBlur={(e) => { if (e.target.value !== c.icon) handleUpdate(c.id, "icon", e.target.value); }}
                    className="w-full text-sm border-neutral-200 rounded-lg px-2 py-1"
                    placeholder="e.g. Smartphone"
                  />
                </td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    defaultValue={c.keywords || ""}
                    onBlur={(e) => { if (e.target.value !== c.keywords) handleUpdate(c.id, "keywords", e.target.value); }}
                    className="w-full text-sm border-neutral-200 rounded-lg px-2 py-1"
                    placeholder="e.g. mobile, phone"
                  />
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDelete(c.id)} className="p-2 text-neutral-400 hover:text-red-600 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">No categories found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
