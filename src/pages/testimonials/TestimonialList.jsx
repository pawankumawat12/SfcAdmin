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
  Heart,
  Star,
} from "lucide-react";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import SearchInput from "../../components/ui/SearchInput";
import Select from "../../components/ui/Select";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Pagination from "../../components/ui/Pagination";
import TestimonialModal from "./TestimonialModal";
import TestimonialHeaderModal from "./TestimonialHeaderModal";
import useDebouncedValue from "../../utils/useDebouncedValue";
import { toAssetUrl } from "../../utils/assetUrl";
import {
  useGetAdminTestimonialsQuery,
  useCreateTestimonialMutation,
  useUpdateTestimonialMutation,
  useToggleTestimonialStatusMutation,
  useReorderTestimonialsMutation,
  useDeleteTestimonialMutation,
  useUpdateTestimonialSettingsMutation,
} from "../../services/testimonialApi";

export default function TestimonialList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const debouncedSearch = useDebouncedValue(search, 400);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [headerModalOpen, setHeaderModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Queries & Mutations
  const { data, isLoading, error } =
    useGetAdminTestimonialsQuery({
      search: debouncedSearch.trim() || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
    });

  const [createTestimonial, { isLoading: isCreating }] = useCreateTestimonialMutation();
  const [updateTestimonial, { isLoading: isUpdating }] = useUpdateTestimonialMutation();
  const [toggleStatus] = useToggleTestimonialStatusMutation();
  const [reorderTestimonials, { isLoading: isReordering }] = useReorderTestimonialsMutation();
  const [deleteTestimonial, { isLoading: isDeleting }] = useDeleteTestimonialMutation();
  const [updateSectionSettings, { isLoading: isSavingHeader }] = useUpdateTestimonialSettingsMutation();

  const testimonials = useMemo(() => data?.data?.testimonials || [], [data]);
  const section = useMemo(() => data?.data?.section || null, [data]);
  const stats = data?.data?.stats || {
    total: testimonials.length,
    active: testimonials.filter((t) => t.is_active).length,
    inactive: testimonials.filter((t) => !t.is_active).length,
    avgRating:
      testimonials.length > 0
        ? (testimonials.reduce((acc, t) => acc + (t.rating || 5), 0) / testimonials.length).toFixed(1)
        : "5.0",
  };

  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const totalPages = Math.ceil(testimonials.length / limit) || 1;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  const paginatedTestimonials = useMemo(() => {
    const start = (page - 1) * limit;
    return testimonials.slice(start, start + limit);
  }, [testimonials, page, limit]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleSaveItem = async (formData) => {
    try {
      if (editingItem) {
        await updateTestimonial({ id: editingItem.id, formData }).unwrap();
        toast.success("Review updated successfully");
      } else {
        await createTestimonial(formData).unwrap();
        toast.success("Review created successfully");
      }
      setModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save review");
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
    const index = testimonials.findIndex((t) => t.id === item.id);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= testimonials.length) return;

    const reordered = [...testimonials];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const payload = reordered.map((it, idx) => ({
      id: it.id,
      display_order: idx + 1,
    }));

    try {
      await reorderTestimonials(payload).unwrap();
      toast.success("Display order updated");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to reorder reviews");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await deleteTestimonial(itemToDelete.id).unwrap();
      toast.success("Review deleted successfully");
      setItemToDelete(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete review");
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
            <Heart size={26} style={{ color: "#e11d48" }} />
            Customer Love (Testimonials)
          </h1>
          <p>
            Manage featured customer reviews and testimonials displayed on the homepage slider.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Button variant="outline" onClick={() => setHeaderModalOpen(true)}>
            <Settings size={16} /> Edit Section Header
          </Button>
          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus size={18} /> Add Review
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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
              Total Reviews
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
              background: "#fef9c3",
              display: "grid",
              placeItems: "center",
              color: "#ca8a04",
            }}
          >
            <Star size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
              Average Rating
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#ca8a04" }}>
              {stats.avgRating} ★
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
              placeholder="Search reviews by name, location, or content..."
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
            {error.data?.message || "Failed to load testimonials."}
          </p>
        )}

        {/* Testimonials Table */}
        <div className="table-responsive table-container">
          <table className="data-table" style={{ width: "100%", minWidth: "760px", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left", fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <th style={{ padding: "12px 16px", width: "110px" }}>Order</th>
                <th style={{ padding: "12px 16px", width: "180px" }}>Customer</th>
                <th style={{ padding: "12px 16px", width: "120px" }}>Rating</th>
                <th style={{ padding: "12px 16px" }}>Review</th>
                <th style={{ padding: "12px 16px", width: "110px" }}>Date</th>
                <th style={{ padding: "12px 16px", width: "100px", textAlign: "center" }}>Status</th>
                <th style={{ padding: "12px 16px", width: "110px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                    Loading reviews...
                  </td>
                </tr>
              ) : testimonials.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                    No testimonials found. Click &quot;Add Review&quot; to create one!
                  </td>
                </tr>
              ) : (
                paginatedTestimonials.map((t, index) => {
                  const isImageUrl =
                    t.avatar &&
                    (t.avatar.startsWith("http") ||
                      t.avatar.startsWith("/") ||
                      t.avatar.includes("."));
                  const initials =
                    !isImageUrl && t.avatar
                      ? t.avatar
                      : (t.name || "C")
                          .split(" ")
                          .filter(Boolean)
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase();
                  const actualIndex = testimonials.findIndex((item) => item.id === t.id);

                  return (
                    <tr
                      key={t.id}
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
                            {t.display_order ?? (actualIndex >= 0 ? actualIndex + 1 : (page - 1) * limit + index + 1)}
                          </span>

                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <Button
                              variant="action"
                              disabled={actualIndex <= 0 || isReordering}
                              onClick={() => handleMove(t, "up")}
                              title="Move Up"
                              aria-label="Move Up"
                              style={{ width: "20px", height: "14px", padding: 0, minWidth: 0 }}
                            >
                              <ArrowUp size={11} />
                            </Button>
                            <Button
                              variant="action"
                              disabled={actualIndex === -1 || actualIndex >= testimonials.length - 1 || isReordering}
                              onClick={() => handleMove(t, "down")}
                              title="Move Down"
                              aria-label="Move Down"
                              style={{ width: "20px", height: "14px", padding: 0, minWidth: 0 }}
                            >
                              <ArrowDown size={11} />
                            </Button>
                          </div>
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {isImageUrl ? (
                            <img
                              src={toAssetUrl(t.avatar)}
                              alt={t.name}
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                objectFit: "cover",
                                border: "1px solid #e2e8f0",
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                background: "#4f7d16",
                                color: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 800,
                                fontSize: "11px",
                                flexShrink: 0,
                              }}
                            >
                              {initials}
                            </div>
                          )}

                          <div style={{ minWidth: 0 }}>
                            <strong style={{ fontSize: "0.88rem", color: "#1e293b", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {t.name}
                            </strong>
                            <span style={{ fontSize: "0.74rem", color: "#64748b" }}>
                              {t.location || "Verified Buyer"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Rating */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "2px", color: "#f59e0b" }}>
                          {Array.from({ length: 5 }).map((_, starIdx) => (
                            <Star
                              key={starIdx}
                              size={14}
                              fill={starIdx < (t.rating || 5) ? "currentColor" : "none"}
                              color={starIdx < (t.rating || 5) ? "#f59e0b" : "#cbd5e1"}
                            />
                          ))}
                          <span style={{ marginLeft: "4px", fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>
                            {t.rating || 5}.0
                          </span>
                        </div>
                      </td>

                      {/* Review */}
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
                            fontStyle: "italic",
                          }}
                        >
                          &ldquo;{t.review}&rdquo;
                        </p>
                      </td>

                      {/* Date */}
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap", fontSize: "0.8rem", color: "#64748b" }}>
                        {t.date_text || "Recently"}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <em
                          className={t.is_active ? "active" : "inactive"}
                          style={{ cursor: "pointer", userSelect: "none" }}
                          onClick={() => handleToggleStatus(t)}
                          title="Click to toggle status"
                        >
                          {t.is_active ? "Active" : "Inactive"}
                        </em>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <Button
                            variant="edit"
                            onClick={() => handleOpenEdit(t)}
                            title={`Edit review from ${t.name}`}
                            aria-label={`Edit review from ${t.name}`}
                          >
                            <Pencil size={15} />
                          </Button>
                          <Button
                            variant="delete"
                            onClick={() => setItemToDelete(t)}
                            title={`Delete review from ${t.name}`}
                            aria-label={`Delete review from ${t.name}`}
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
          total={testimonials.length}
          limit={limit}
          onPageChange={setPage}
          itemLabel="reviews"
          className="p-3 border-top"
        />
      </div>

      {/* Add / Edit Review Modal */}
      <TestimonialModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSaveItem}
        initialData={editingItem}
        isSubmitting={isCreating || isUpdating}
      />

      {/* Section Header Settings Modal */}
      <TestimonialHeaderModal
        isOpen={headerModalOpen}
        onClose={() => setHeaderModalOpen(false)}
        onSubmit={handleSaveHeader}
        initialData={section}
        isSubmitting={isSavingHeader}
      />

      {/* Delete Confirmation */}
      {itemToDelete && (
        <ConfirmDialog
          title="Delete Testimonial?"
          message={`Are you sure you want to delete the review from "${itemToDelete.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirm}
          onClose={() => setItemToDelete(null)}
          isLoading={isDeleting}
        />
      )}
    </>
  );
}
