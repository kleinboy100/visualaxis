import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { formatZar, previewUrl } from "@/lib/format";
import { adminListUsers, setUserRole, claimFirstAdmin } from "@/lib/shop.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin console — Visual Axis" },
      { name: "description", content: "Manage events, photos, orders and users for Visual Axis." },
      { property: "og:title", content: "Admin console — Visual Axis" },
      { property: "og:description", content: "Visual Axis site administration." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

function AdminPage() {
  const { user, isAdmin, loading, refreshRole } = useAuth();
  const navigate = useNavigate();
  const claim = useServerFn(claimFirstAdmin);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This area is for site administrators. If you are the site owner and no administrator
          exists yet, you can claim ownership now.
        </p>
        <Button
          className="mt-6"
          onClick={async () => {
            try {
              await claim({});
              await refreshRole();
              toast.success("You are now an administrator");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not claim admin access");
            }
          }}
        >
          Claim owner access
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-3 text-3xl font-semibold">Console</h1>
      <div className="axis-rule mt-6" />

      <Tabs defaultValue="events" className="mt-8">
        <TabsList>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>
        <TabsContent value="events" className="mt-6">
          <EventsTab />
        </TabsContent>
        <TabsContent value="photos" className="mt-6">
          <PhotosTab />
        </TabsContent>
        <TabsContent value="orders" className="mt-6">
          <OrdersTab />
        </TabsContent>
        <TabsContent value="users" className="mt-6">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function useAdminEvents() {
  return useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, slug, location, event_date, published, parent_id, cover_url, description")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

type AdminEvent = {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  event_date: string | null;
  published: boolean;
  parent_id: string | null;
  cover_url: string | null;
  description: string | null;
};

const emptyForm = {
  name: "",
  parentId: "",
  location: "",
  eventDate: "",
  description: "",
};

function EventsTab() {
  const qc = useQueryClient();
  const { data: events } = useAdminEvents();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const all = (events ?? []) as AdminEvent[];
  const parents = all.filter((e) => !e.parent_id);
  const nameOf = (id: string | null) => all.find((e) => e.id === id)?.name ?? "";

  const reset = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z
      .object({
        name: z.string().trim().min(2).max(120),
        location: z.string().trim().max(120),
        description: z.string().trim().max(1000),
      })
      .safeParse(form);
    if (!parsed.success) {
      toast.error("Enter a valid event name (2-120 characters)");
      return;
    }
    setBusy(true);
    const payload = {
      name: parsed.data.name,
      parent_id: form.parentId || null,
      location: parsed.data.location || null,
      event_date: form.eventDate || null,
      description: parsed.data.description || null,
    };
    const { error } = editingId
      ? await supabase.from("events").update(payload).eq("id", editingId)
      : await supabase.from("events").insert({
          ...payload,
          slug: slugify(parsed.data.name) || crypto.randomUUID().slice(0, 8),
        });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    reset();
    toast.success(editingId ? "Event updated" : "Event created");
    void qc.invalidateQueries({ queryKey: ["admin-events"] });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={submit} className="panel h-fit space-y-4 p-5">
        <p className="font-display text-lg font-semibold">
          {editingId ? "Edit event" : "New event or sub-folder"}
        </p>
        <div className="space-y-2">
          <Label htmlFor="ev-name">Name</Label>
          <Input
            id="ev-name"
            value={form.name}
            maxLength={120}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ev-parent">Belongs to</Label>
          <select
            id="ev-parent"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={form.parentId}
            onChange={(e) => setForm({ ...form, parentId: e.target.value })}
          >
            <option value="">Main event (top level)</option>
            {parents
              .filter((p) => p.id !== editingId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  Sub-folder of {p.name}
                </option>
              ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ev-loc">Location</Label>
          <Input
            id="ev-loc"
            value={form.location}
            maxLength={120}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ev-date">Date</Label>
          <Input
            id="ev-date"
            type="date"
            value={form.eventDate}
            onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ev-desc">Description</Label>
          <Textarea
            id="ev-desc"
            rows={3}
            maxLength={1000}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {editingId ? "Save changes" : "Create event"}
        </Button>
        {editingId && (
          <Button type="button" variant="outline" className="w-full" onClick={reset}>
            Cancel
          </Button>
        )}
      </form>

      <div className="space-y-3">
        {all.map((event) => (
          <div
            key={event.id}
            className={`panel flex flex-wrap items-center gap-4 p-4 ${event.parent_id ? "ml-6" : ""}`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-semibold">
                {event.parent_id ? `↳ ${event.name}` : event.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                /{event.slug}
                {event.parent_id ? ` · in ${nameOf(event.parent_id)}` : " · main event"}
                {event.event_date ? ` · ${event.event_date}` : ""}
                {event.location ? ` · ${event.location}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Published</span>
              <Switch
                checked={event.published}
                onCheckedChange={async (checked) => {
                  const { error } = await supabase
                    .from("events")
                    .update({ published: checked })
                    .eq("id", event.id);
                  if (error) toast.error(error.message);
                  else void qc.invalidateQueries({ queryKey: ["admin-events"] });
                }}
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingId(event.id);
                setForm({
                  name: event.name,
                  parentId: event.parent_id ?? "",
                  location: event.location ?? "",
                  eventDate: event.event_date ?? "",
                  description: event.description ?? "",
                });
              }}
            >
              Edit
            </Button>
            <button
              aria-label="Delete event"
              className="text-muted-foreground hover:text-destructive"
              onClick={async () => {
                if (!window.confirm(`Delete "${event.name}" and all its photos?`)) return;
                const { error } = await supabase.from("events").delete().eq("id", event.id);
                if (error) toast.error(error.message);
                else {
                  toast.success("Event deleted");
                  void qc.invalidateQueries({ queryKey: ["admin-events"] });
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {all.length === 0 && (
          <div className="panel p-10 text-center text-sm text-muted-foreground">
            No events yet. Create your first one.
          </div>
        )}
      </div>
    </div>
  );
}


function PhotosTab() {
  const qc = useQueryClient();
  const { data: events } = useAdminEvents();
  const [eventId, setEventId] = useState("");
  const [digital, setDigital] = useState(150);
  const [print, setPrint] = useState(350);
  const [codePrefix, setCodePrefix] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });
  const [dragging, setDragging] = useState(false);

  const { data: photos } = useQuery({
    queryKey: ["admin-photos", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("id, title, code, preview_path, original_path, digital_price_cents, print_price_cents")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const uploadOne = async (file: File, index: number) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const key = `${eventId}/${crypto.randomUUID()}.${ext}`;
    const contentType = file.type || "image/jpeg";
    const previewRes = await supabase.storage
      .from("photo-previews")
      .upload(key, file, { contentType, upsert: false });
    if (previewRes.error) throw new Error(previewRes.error.message);
    const originalRes = await supabase.storage
      .from("photo-originals")
      .upload(key, file, { contentType, upsert: false });
    const { error } = await supabase.from("photos").insert({
      event_id: eventId,
      title: file.name.replace(/\.[^.]+$/, "").slice(0, 120),
      code: `${codePrefix.trim()}${String(index + 1).padStart(4, "0")}`.slice(0, 40),
      preview_path: key,
      original_path: originalRes.error ? null : key,
      digital_price_cents: Math.round(digital * 100),
      print_price_cents: Math.round(print * 100),
    });
    if (error) throw new Error(error.message);
  };

  const bulkUpload = async (fileList: FileList | File[] | null) => {
    if (!fileList || !eventId) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) {
      toast.error("No image files found in that selection.");
      return;
    }
    const startIndex = photos?.length ?? 0;
    setUploading(true);
    setProgress({ done: 0, total: files.length, failed: 0 });

    const CONCURRENCY = 4;
    let cursor = 0;
    let failed = 0;
    const worker = async () => {
      while (cursor < files.length) {
        const i = cursor++;
        const file = files[i]!;
        try {
          await uploadOne(file, startIndex + i);
        } catch (err) {
          failed += 1;
          console.error("Upload failed", file.name, err);
        }
        setProgress((p) => ({ ...p, done: p.done + 1, failed }));
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker));

    setUploading(false);
    const ok = files.length - failed;
    if (ok > 0) toast.success(`${ok} photo${ok > 1 ? "s" : ""} uploaded`);
    if (failed > 0) toast.error(`${failed} file${failed > 1 ? "s" : ""} could not be uploaded`);
    void qc.invalidateQueries({ queryKey: ["admin-photos", eventId] });
  };

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="panel grid gap-4 p-5 sm:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="ph-event">Event</Label>
          <select
            id="ph-event"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          >
            <option value="">Select an event or folder…</option>
            {((events ?? []) as AdminEvent[]).map((e) => (
              <option key={e.id} value={e.id}>
                {e.parent_id
                  ? `${(events ?? []).find((p) => p.id === e.parent_id)?.name ?? ""} › ${e.name}`
                  : e.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ph-digital">Digital price (R)</Label>
          <Input
            id="ph-digital"
            type="number"
            min={1}
            max={100000}
            value={digital}
            onChange={(e) => setDigital(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ph-print">Print price (R)</Label>
          <Input
            id="ph-print"
            type="number"
            min={1}
            max={100000}
            value={print}
            onChange={(e) => setPrint(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ph-prefix">Code prefix</Label>
          <Input
            id="ph-prefix"
            value={codePrefix}
            maxLength={12}
            placeholder="e.g. ATH-"
            onChange={(e) => setCodePrefix(e.target.value)}
          />
        </div>

        <div className="sm:col-span-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (eventId && !uploading) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (!eventId || uploading) return;
              void bulkUpload(e.dataTransfer.files);
            }}
            className={`rounded-md border border-dashed px-4 py-10 text-center text-sm ${
              dragging ? "border-primary bg-secondary" : "border-border"
            }`}
          >
            <Upload className="mx-auto h-5 w-5 text-primary" />
            <p className="mt-2 font-medium">
              {eventId ? "Drag and drop photos here" : "Select an event first"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Bulk upload — hundreds of files at a time, 4 uploaded in parallel.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!eventId || uploading}
                onClick={() => filesInputRef.current?.click()}
              >
                Choose files
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!eventId || uploading}
                onClick={() => folderInputRef.current?.click()}
              >
                Choose a folder
              </Button>
            </div>
          </div>

          <input
            ref={filesInputRef}
            id="ph-files"
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              const files = e.target.files;
              e.target.value = "";
              void bulkUpload(files);
            }}
          />
          <input
            ref={folderInputRef}
            id="ph-folder"
            type="file"
            accept="image/*"
            multiple
            // @ts-expect-error non-standard directory picker attributes
            webkitdirectory=""
            directory=""
            className="sr-only"
            onChange={(e) => {
              const files = e.target.files;
              e.target.value = "";
              void bulkUpload(files);
            }}
          />


          {(uploading || progress.total > 0) && (
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {progress.done}/{progress.total} processed
                {progress.failed > 0 ? ` · ${progress.failed} failed` : ""}
                {uploading ? " · uploading…" : " · done"}
              </p>
            </div>
          )}
        </div>
      </div>


      {eventId && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {(photos ?? []).map((photo) => (
            <div key={photo.id} className="panel overflow-hidden">
              <img
                src={previewUrl(photo.preview_path)}
                alt={photo.title ?? "Photo"}
                className="aspect-[3/2] w-full object-cover"
              />
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{photo.title ?? photo.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatZar(photo.digital_price_cents)} / {formatZar(photo.print_price_cents)}
                  </p>
                </div>
                <button
                  aria-label="Delete photo"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={async () => {
                    if (!window.confirm("Delete this photo?")) return;
                    await supabase.storage.from("photo-previews").remove([photo.preview_path]);
                    if (photo.original_path) {
                      await supabase.storage.from("photo-originals").remove([photo.original_path]);
                    }
                    const { error } = await supabase.from("photos").delete().eq("id", photo.id);
                    if (error) toast.error(error.message);
                    else void qc.invalidateQueries({ queryKey: ["admin-photos", eventId] });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {(photos ?? []).length === 0 && (
            <div className="panel col-span-full p-10 text-center text-sm text-muted-foreground">
              No photos in this event yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OrdersTab() {
  const { data: orders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, status, total_cents, created_at, shipping_address, order_items(id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const paidTotal = (orders ?? [])
    .filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + o.total_cents, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel p-4">
          <p className="eyebrow">Orders</p>
          <p className="mt-1 font-display text-2xl font-semibold">{orders?.length ?? 0}</p>
        </div>
        <div className="panel p-4">
          <p className="eyebrow">Paid</p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {(orders ?? []).filter((o) => o.status === "paid").length}
          </p>
        </div>
        <div className="panel p-4">
          <p className="eyebrow">Revenue</p>
          <p className="mt-1 font-display text-2xl font-semibold">{formatZar(paidTotal)}</p>
        </div>
      </div>

      <div className="space-y-2">
        {(orders ?? []).map((order) => (
          <div key={order.id} className="panel flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold">
                {order.id.slice(0, 8).toUpperCase()}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(order.created_at).toLocaleString("en-ZA")} ·{" "}
                {order.order_items?.length ?? 0} items
                {order.shipping_address ? " · ships" : ""}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs capitalize text-muted-foreground">{order.status}</span>
              <span className="text-sm">{formatZar(order.total_cents)}</span>
            </div>
          </div>
        ))}
        {(orders ?? []).length === 0 && (
          <div className="panel p-10 text-center text-sm text-muted-foreground">No orders yet.</div>
        )}
      </div>
    </div>
  );
}

const OWNER_EMAIL = "mozksolutions@gmail.com";

function UsersTab() {
  const { user } = useAuth();
  const canManageRoles = (user?.email ?? "").toLowerCase() === OWNER_EMAIL;
  const listUsers = useServerFn(adminListUsers);
  const updateRole = useServerFn(setUserRole);
  const { data: users, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listUsers({}),
  });

  return (
    <div className="space-y-2">
      {(users ?? []).map((u) => (
        <div key={u.id} className="panel flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{u.full_name || u.email}</p>
            <p className="truncate text-xs text-muted-foreground">
              {u.email} · joined {new Date(u.created_at).toLocaleDateString("en-ZA")}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{u.isAdmin ? "Admin" : "User"}</span>
            {canManageRoles && (
            <Switch
              checked={u.isAdmin}
              onCheckedChange={async (checked) => {
                try {
                  await updateRole({ data: { userId: u.id, makeAdmin: checked } });
                  await refetch();
                  toast.success("Role updated");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not update role");
                }
              }}
            />
            )}
          </div>
        </div>
      ))}
      {(users ?? []).length === 0 && (
        <div className="panel p-10 text-center text-sm text-muted-foreground">No users yet.</div>
      )}
    </div>
  );
}
