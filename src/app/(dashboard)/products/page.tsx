"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package, Plus, Search, RefreshCw, Trash2, Edit2, ArrowDownToLine,
  CheckCircle2, XCircle, AlertTriangle, Loader2, X, ExternalLink,
} from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Product {
  id: string;
  platform: string;
  externalProductId: string;
  name: string;
  description?: string | null;
  price: number;
  comparePrice?: number | null;
  sku?: string | null;
  stock?: number | null;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductStats {
  total: number;
  active: number;
  outOfStock: number;
  drafts: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  SHOPIFY: "bg-[#96bf48]/10 text-[#96bf48] border-[#96bf48]/30",
  WOOCOMMERCE: "bg-[#7f54b3]/10 text-[#7f54b3] border-[#7f54b3]/30",
  YOUCAN: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  LIGHTFUNNELS: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  MANUAL: "bg-gray-500/10 text-gray-500 border-gray-500/30",
};

function AddProductModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: "", description: "", price: "", comparePrice: "", sku: "", stock: "", imageUrl: "", isActive: true,
  });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          price: parseFloat(form.price) || 0,
          comparePrice: form.comparePrice ? parseFloat(form.comparePrice) : null,
          sku: form.sku || null,
          stock: form.stock !== "" ? parseInt(form.stock) : null,
          imageUrl: form.imageUrl || null,
          isActive: form.isActive,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card border shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-bold">Add Product</h2>
            <p className="text-sm text-muted-foreground">Add a product to your catalog manually</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Product Name *</label>
            <Input placeholder="e.g. Blue T-Shirt" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              placeholder="Product description..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Price (MAD) *</label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Compare Price</label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.comparePrice} onChange={(e) => setForm({ ...form, comparePrice: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">SKU</label>
              <Input placeholder="SKU-001" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Stock Qty</label>
              <Input type="number" min="0" placeholder="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Image URL</label>
            <Input type="url" placeholder="https://..." value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Active</label>
            <button
              type="button"
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? "bg-primary" : "bg-muted"}`}
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.isActive ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex gap-3 p-6 border-t">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            variant="whatsapp"
            className="flex-1"
            disabled={!form.name || !form.price || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Product
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditProductModal({ product, onClose, onSuccess }: { product: Product; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: product.name,
    description: product.description ?? "",
    price: String(product.price),
    comparePrice: product.comparePrice ? String(product.comparePrice) : "",
    sku: product.sku ?? "",
    stock: product.stock !== null && product.stock !== undefined ? String(product.stock) : "",
    imageUrl: product.imageUrl ?? "",
    isActive: product.isActive,
  });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          price: parseFloat(form.price) || 0,
          comparePrice: form.comparePrice ? parseFloat(form.comparePrice) : null,
          sku: form.sku || null,
          stock: form.stock !== "" ? parseInt(form.stock) : null,
          imageUrl: form.imageUrl || null,
          isActive: form.isActive,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card border shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-bold">Edit Product</h2>
            <p className="text-sm text-muted-foreground">{product.name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Product Name *</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Price (MAD)</label>
              <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Compare Price</label>
              <Input type="number" min="0" step="0.01" value={form.comparePrice} onChange={(e) => setForm({ ...form, comparePrice: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">SKU</label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Stock Qty</label>
              <Input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Image URL</label>
            <Input type="url" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Active</label>
            <button
              type="button"
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? "bg-primary" : "bg-muted"}`}
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.isActive ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex gap-3 p-6 border-t">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            variant="whatsapp"
            className="flex-1"
            disabled={!form.name || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [syncMsg, setSyncMsg] = useState("");

  const { data, isLoading } = useQuery<{ data: Product[]; stats: ProductStats }>({
    queryKey: ["products", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const r = await fetch(`/api/products?${params}`);
      return r.json();
    },
  });

  const products = data?.data ?? [];
  const stats = data?.stats ?? { total: 0, active: 0, outOfStock: 0, drafts: 0 };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/products/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      setSyncMsg("");
      const res = await fetch("/api/integrations/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data as { totalSynced: number };
    },
    onSuccess: (d) => {
      setSyncMsg(`${d.totalSynced} products synced from your stores`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: Error) => setSyncMsg(`Error: ${err.message}`),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["products"] });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header
        title="Products"
        description="Manage your product catalog"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" disabled={syncMutation.isPending} onClick={() => syncMutation.mutate()}>
              {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
              Bulk Import
            </Button>
            <Button variant="whatsapp" size="sm" className="gap-2" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Products", value: stats.total, icon: Package, color: "text-blue-500", bg: "bg-blue-500/10" },
            { label: "Active", value: stats.active, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
            { label: "Out of Stock", value: stats.outOfStock, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
            { label: "Drafts", value: stats.drafts, icon: XCircle, color: "text-yellow-500", bg: "bg-yellow-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`rounded-lg p-2 ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sync result */}
        {syncMsg && (
          <div className={`rounded-lg border p-3 text-sm flex items-center justify-between ${syncMsg.startsWith("Error") ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-green-50 text-green-700 border-green-200"}`}>
            <span>{syncMsg}</span>
            <button onClick={() => setSyncMsg("")}><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Search + Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {[
              { label: "All", value: "" },
              { label: "Active", value: "active" },
              { label: "Out of Stock", value: "outofstock" },
              { label: "Drafts", value: "inactive" },
            ].map(({ label, value }) => (
              <button
                key={value}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${statusFilter === value ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"}`}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={refresh}><RefreshCw className="h-4 w-4" /></Button>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-2xl bg-muted/50 p-6 mb-4">
              <Package className="h-12 w-12 text-muted-foreground mx-auto" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No products yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Add products manually or import from your connected stores</p>
            <div className="flex gap-3">
              <Button variant="outline" className="gap-2" onClick={() => syncMutation.mutate()}>
                <ArrowDownToLine className="h-4 w-4" /> Import from Store
              </Button>
              <Button variant="whatsapp" className="gap-2" onClick={() => setShowAdd(true)}>
                <Plus className="h-4 w-4" /> Add Product
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => (
              <Card key={product.id} className={`group relative overflow-hidden transition-shadow hover:shadow-md ${!product.isActive ? "opacity-60" : ""}`}>
                {/* Image */}
                <div className="aspect-square bg-muted/50 overflow-hidden">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                <CardContent className="p-3 space-y-2">
                  {/* Platform badge */}
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={`text-[10px] ${PLATFORM_COLORS[product.platform] ?? ""}`}>
                      {product.platform}
                    </Badge>
                    {!product.isActive && <Badge variant="secondary" className="text-[10px]">Draft</Badge>}
                    {product.isActive && product.stock !== null && product.stock !== undefined && product.stock <= 0 && (
                      <Badge variant="destructive" className="text-[10px]">Out of Stock</Badge>
                    )}
                  </div>

                  <div>
                    <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                    {product.sku && <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{product.price.toFixed(2)} MAD</span>
                    {product.comparePrice && (
                      <span className="text-xs text-muted-foreground line-through">{product.comparePrice.toFixed(2)}</span>
                    )}
                  </div>

                  {product.stock !== null && product.stock !== undefined && (
                    <p className="text-xs text-muted-foreground">{product.stock} in stock</p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs gap-1"
                      onClick={() => setEditing(product)}
                    >
                      <Edit2 className="h-3 w-3" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(product.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {product.imageUrl && (
                      <a href={product.imageUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost" className="h-7 px-2">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {showAdd && (
        <AddProductModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
        />
      )}
      {editing && (
        <EditProductModal
          product={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
        />
      )}
    </div>
  );
}
