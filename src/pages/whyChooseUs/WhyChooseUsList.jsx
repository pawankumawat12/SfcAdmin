import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  CheckCircle2,
  XCircle,
  Settings,
  Leaf,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import SearchInput from "../../components/ui/SearchInput";
import Select from "../../components/ui/Select";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Pagination from "../../components/ui/Pagination";
import WhyChooseUsModal from "./WhyChooseUsModal";
import WhyChooseUsHeaderModal from "./WhyChooseUsHeaderModal";
import { ICON_MAP } from "./iconMap";
import useDebouncedValue from "../../utils/useDebouncedValue";
import { toAssetUrl } from "../../utils/assetUrl";
import {
  useGetAdminWhyChooseUsQuery,
  useCreateWhyChooseUsMutation,
  useUpdateWhyChooseUsMutation,
  useToggleWhyChooseUsStatusMutation,
  useReorderWhyChooseUsMutation,
  useDeleteWhyChooseUsMutation,
  useUpdateWhyChooseUsSettingsMutation,
} from "../../services/whyChooseUsApi";

export default function WhyChooseUsList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const debouncedSearch = useDebouncedValue(search, 400);

  // Modals state
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [headerModalOpen, setHeaderModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Queries & Mutations
  const { data, isLoading, error } =
    useGetAdminWhyChooseUsQuery({
      search: debouncedSearch.trim() || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
    });

  const [createItem, { isLoading: isCreating }] = useCreateWhyChooseUsMutation();
  const [updateItem, { isLoading: isUpdating }] = useUpdateWhyChooseUsMutation();
  const [toggleStatus] = useToggleWhyChooseUsStatusMutation();
  const [reorderItems, { isLoading: isReordering }] = useReorderWhyChooseUsMutation();
  const [deleteItem, { isLoading: isDeleting }] = useDeleteWhyChooseUsMutation();
  const [updateSectionSettings, { isLoading: isSavingHeader }] = useUpdateWhyChooseUsSettingsMutation();

  const items = useMemo(() => data?.data?.items || [], [data]);
  const section = useMemo(() => data?.data?.section || null, [data]);
  const stats = data?.data?.stats || {
    total: items.length,
    active: items.filter((i) => i.is_active).length,
    inactive: items.filter((i) => !i.is_active).length,
  };

  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const totalPages = Math.ceil(items.length / limit) || 1;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * limit;
    return items.slice(start, start + limit);
  }, [items, page, limit]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setItemModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setItemModalOpen(true);
  };

  const handleSaveItem = async (formData) => {
    try {
      if (editingItem) {
        await updateItem({ id: editingItem.id, formData }).unwrap();
        toast.success("Feature updated successfully");
      } else {
        await createItem(formData).unwrap();
        toast.success("Feature created successfully");
      }
      setItemModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save feature");
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      const res = await toggleStatus({ id: item.id, is_active: !item.is_active }).unwrap();
      toast.success(res.message || "Status updated");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update status");
    }
  };

  const handleMove = async (item, direction) => {
    const index = items.findIndex((i) => i.id === item.id);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const reordered = [...items];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const payload = reordered.map((it, idx) => ({
      id: it.id,
      display_order: idx + 1,
    }));

    try {
      await reorderItems(payload).unwrap();
      toast.success("Display order updated");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to reorder items");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await deleteItem(itemToDelete.id).unwrap();
      toast.success("Feature deleted successfully");
      setItemToDelete(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete feature");
    }
  };

  const handleSaveHeader = async (headerData) => {
    try {
      await updateSectionSettings(headerData).unwrap();
      toast.success("Section header settings updated successfully");
      setHeaderModalOpen(false);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update header settings");
    }
  };

  return (
    <>
      {/* Section Head */}
      <div className="section-head">
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Sparkles size={26} style={{ color: "#4f7d16" }} />
            Why Choose Us
          </h1>
          <p>
            Manage the &quot;More Than Just Fast Food&quot; value proposition features and section header on your storefront.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Button variant="outline" onClick={() => setHeaderModalOpen(true)}>
            <Settings size={16} /> Edit Section Header
          </Button>
          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus size={18} /> Add Feature
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div
          className="card"
          style={{
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "#f1f5f9",
              display: "grid",
              placeItems: "center",
              color: "#334155",
            }}
          >
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
              Total Features
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#1e293b" }}>
              {stats.total}
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "#ecfdf5",
              display: "grid",
              placeItems: "center",
              color: "#059669",
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
              Active (Live on Site)
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#059669" }}>
              {stats.active}
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "#fef2f2",
              display: "grid",
              placeItems: "center",
              color: "#dc2626",
            }}
          >
            <XCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
              Inactive (Hidden)
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#dc2626" }}>
              {stats.inactive}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card table-card">
        {/* Toolbar */}
        <div className="table-toolbar" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "240px" }}>
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search features by title or description..."
            />
          </div>

          <div style={{ width: "160px" }}>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </Select>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p className="error table-error" style={{ margin: "16px 20px" }}>
            {error.data?.message || "Failed to load features."}
          </p>
        )}

        {/* Features Table */}
        <div className="table-responsive table-container">
          <table className="data-table" style={{ width: "100%", minWidth: "680px", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left", fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <th style={{ padding: "12px 16px", width: "110px" }}>Order</th>
                <th style={{ padding: "12px 16px", width: "100px" }}>Icon</th>
                <th style={{ padding: "12px 16px" }}>Title</th>
                <th style={{ padding: "12px 16px" }}>Description</th>
                <th style={{ padding: "12px 16px", width: "110px", textAlign: "center" }}>Status</th>
                <th style={{ padding: "12px 16px", width: "110px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                    Loading features...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                    No features found. Click &quot;Add Feature&quot; to create one!
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => {
                  const IconComponent = ICON_MAP[item.icon] || Leaf;
                  const actualIndex = items.findIndex((i) => i.id === item.id);

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s",
                      }}
                    >
                      {/* Order & Up/Down Arrows */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              width: "26px",
                              height: "26px",
                              lineHeight: "26px",
                              textAlign: "center",
                              borderRadius: "6px",
                              background: "#f1f5f9",
                              fontWeight: 800,
                              fontSize: "0.82rem",
                              color: "#334155",
                            }}
                          >
                            {item.display_order ?? (actualIndex >= 0 ? actualIndex + 1 : (page - 1) * limit + index + 1)}
                          </span>

                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <Button
                              variant="action"
                              disabled={actualIndex <= 0 || isReordering}
                              onClick={() => handleMove(item, "up")}
                              title="Move Up"
                              aria-label="Move Up"
                              style={{ width: "20px", height: "14px", padding: 0, minWidth: 0 }}
                            >
                              <ArrowUp size={11} />
                            </Button>
                            <Button
                              variant="action"
                              disabled={actualIndex === -1 || actualIndex >= items.length - 1 || isReordering}
                              onClick={() => handleMove(item, "down")}
                              title="Move Down"
                              aria-label="Move Down"
                              style={{ width: "20px", height: "14px", padding: 0, minWidth: 0 }}
                            >
                              <ArrowDown size={11} />
                            </Button>
                          </div>
                        </div>
                      </td>

                      {/* Icon / Image */}
                      <td style={{ padding: "14px 16px" }}>
                        <div
                          style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "10px",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#4f7d16",
                            overflow: "hidden",
                          }}
                        >
                          {item.image ? (
                            <img
                              src={toAssetUrl(item.image)}
                              alt={item.title}
                              style={{ width: "100%", height: "100%", objectFit: "contain", padding: "4px" }}
                            />
                          ) : (
                            <IconComponent size={20} />
                          )}
                        </div>
                      </td>

                      {/* Title */}
                      <td style={{ padding: "14px 16px" }}>
                        <strong style={{ fontSize: "0.9rem", color: "#1e293b", display: "block" }}>
                          {item.title}
                        </strong>
                        <span style={{ fontSize: "0.74rem", color: "#64748b" }}>
                          Icon: {item.icon || "Default"}
                        </span>
                      </td>

                      {/* Description */}
                      <td style={{ padding: "14px 16px", maxWidth: "340px" }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.82rem",
                            color: "#475569",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            lineHeight: 1.4,
                          }}
                        >
                          {item.description}
                        </p>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <em
                          className={item.is_active ? "active" : "inactive"}
                          style={{ cursor: "pointer", userSelect: "none" }}
                          onClick={() => handleToggleStatus(item)}
                          title="Click to toggle status"
                        >
                          {item.is_active ? "Active" : "Inactive"}
                        </em>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <Button
                            variant="edit"
                            onClick={() => handleOpenEdit(item)}
                            title={`Edit ${item.title}`}
                            aria-label={`Edit ${item.title}`}
                          >
                            <Pencil size={15} />
                          </Button>
                          <Button
                            variant="delete"
                            onClick={() => setItemToDelete(item)}
                            title={`Delete ${item.title}`}
                            aria-label={`Delete ${item.title}`}
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          page={page}
          totalPages={totalPages}
          total={items.length}
          limit={limit}
          onPageChange={setPage}
          itemLabel="features"
          className="p-3 border-top"
        />
      </div>

      {/* Add / Edit Feature Modal */}
      <WhyChooseUsModal
        isOpen={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        onSubmit={handleSaveItem}
        initialData={editingItem}
        isSubmitting={isCreating || isUpdating}
      />

      {/* Section Header Settings Modal */}
      <WhyChooseUsHeaderModal
        isOpen={headerModalOpen}
        onClose={() => setHeaderModalOpen(false)}
        onSubmit={handleSaveHeader}
        initialData={section}
        isSubmitting={isSavingHeader}
      />

      {/* Delete Confirmation */}
      {itemToDelete && (
        <ConfirmDialog
          title="Delete Feature?"
          message={`Are you sure you want to delete "${itemToDelete.title}"? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirm}
          onClose={() => setItemToDelete(null)}
          isLoading={isDeleting}
        />
      )}
    </>
  );
}
