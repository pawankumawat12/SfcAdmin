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
  ExternalLink,
  Sparkles,
  Search,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import SearchInput from "../../components/ui/SearchInput";
import Select from "../../components/ui/Select";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Pagination from "../../components/ui/Pagination";
import HeroSliderModal from "./HeroSliderModal";
import useDebouncedValue from "../../utils/useDebouncedValue";
import { toAssetUrl } from "../../utils/assetUrl";
import {
  useGetAdminHeroSlidersQuery,
  useCreateHeroSliderMutation,
  useUpdateHeroSliderMutation,
  useToggleHeroSliderStatusMutation,
  useReorderHeroSlidersMutation,
  useDeleteHeroSliderMutation,
} from "../../services/heroSliderApi";

export default function HeroSliderList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const debouncedSearch = useDebouncedValue(search, 400);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlider, setEditingSlider] = useState(null);
  const [sliderToDelete, setSliderToDelete] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Queries & Mutations
  const { data, isLoading, isFetching, error, refetch } =
    useGetAdminHeroSlidersQuery({
      search: debouncedSearch.trim() || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
    });

  const [createSlider, { isLoading: isCreating }] =
    useCreateHeroSliderMutation();
  const [updateSlider, { isLoading: isUpdating }] =
    useUpdateHeroSliderMutation();
  const [toggleStatus] = useToggleHeroSliderStatusMutation();
  const [reorderSliders, { isLoading: isReordering }] =
    useReorderHeroSlidersMutation();
  const [deleteSlider, { isLoading: isDeleting }] =
    useDeleteHeroSliderMutation();

  const sliders = useMemo(() => data?.data?.sliders || [], [data]);
  const stats = data?.data?.stats || {
    total: sliders.length,
    active: sliders.filter((s) => s.is_active).length,
    inactive: sliders.filter((s) => !s.is_active).length,
  };

  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const totalPages = Math.ceil(sliders.length / limit) || 1;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  const paginatedSliders = useMemo(() => {
    const start = (page - 1) * limit;
    return sliders.slice(start, start + limit);
  }, [sliders, page, limit]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingSlider(null);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (slider) => {
    setEditingSlider(slider);
    setModalOpen(true);
  };

  // Save (Create or Update)
  const handleSave = async (formData) => {
    try {
      if (editingSlider) {
        await updateSlider({ id: editingSlider.id, formData }).unwrap();
        toast.success("Hero slider updated successfully");
      } else {
        await createSlider(formData).unwrap();
        toast.success("Hero slider created successfully");
      }
      setModalOpen(false);
      setEditingSlider(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save slider");
    }
  };

  // Quick Toggle Status
  const handleToggleStatus = async (slider) => {
    try {
      await toggleStatus({
        id: slider.id,
        is_active: !slider.is_active,
      }).unwrap();
      toast.success(
        `Slider ${!slider.is_active ? "activated" : "deactivated"}`
      );
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update slider status");
    }
  };

  // Quick Move Up / Down
  const handleMove = async (slider, direction) => {
    const index = sliders.findIndex((s) => s.id === slider.id);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sliders.length) return;

    const reorderedList = [...sliders];
    const [moved] = reorderedList.splice(index, 1);
    reorderedList.splice(targetIndex, 0, moved);

    const itemsPayload = reorderedList.map((item, idx) => ({
      id: item.id,
      display_order: idx + 1,
    }));

    try {
      await reorderSliders(itemsPayload).unwrap();
      toast.success("Slider order updated");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to reorder sliders");
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!sliderToDelete) return;
    try {
      await deleteSlider(sliderToDelete.id).unwrap();
      toast.success("Slider deleted successfully");
      setSliderToDelete(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete slider");
    }
  };

  return (
    <>
      {/* Section Head */}
      <div className="section-head">
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <SlidersHorizontal size={26} style={{ color: "#4f7d16" }} />
            Hero Sliders
          </h1>
          <p>
            Manage the frontend homepage hero slider, images, headlines, CTA links, and display order.
          </p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus size={18} /> Add Slider
        </Button>
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
              Total Sliders
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
              placeholder="Search by title, highlight, tag, or subtitle..."
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
            {error.data?.message || "Failed to load hero sliders."}
          </p>
        )}

        {/* Sliders Table */}
        <div className="table-responsive table-container">
          <table className="data-table" style={{ width: "100%", minWidth: "760px", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left", fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <th style={{ padding: "12px 16px", width: "100px" }}>Order</th>
                <th style={{ padding: "12px 16px", width: "130px" }}>Image</th>
                <th style={{ padding: "12px 16px" }}>Headline & Tag</th>
                <th style={{ padding: "12px 16px" }}>Subtitle</th>
                <th style={{ padding: "12px 16px" }}>Buttons</th>
                <th style={{ padding: "12px 16px", width: "110px", textAlign: "center" }}>Status</th>
                <th style={{ padding: "12px 16px", width: "100px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                    Loading sliders...
                  </td>
                </tr>
              ) : sliders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                    No hero sliders found. Click &quot;Add Slider&quot; to create one!
                  </td>
                </tr>
              ) : (
                paginatedSliders.map((slider, index) => {
                  const imgSrc = toAssetUrl(slider.image || slider.img);
                  const actualIndex = sliders.findIndex((s) => s.id === slider.id);

                  return (
                    <tr
                      key={slider.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s",
                      }}
                    >
                      {/* Display Order & Up/Down Arrows */}
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
                            {slider.display_order ?? (actualIndex >= 0 ? actualIndex + 1 : (page - 1) * limit + index + 1)}
                          </span>

                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <button
                              type="button"
                              onClick={() => handleMove(slider, "up")}
                              disabled={actualIndex <= 0 || isReordering}
                              aria-label="Move Up"
                              style={{
                                border: "none",
                                background: "none",
                                cursor: actualIndex <= 0 ? "not-allowed" : "pointer",
                                opacity: actualIndex <= 0 ? 0.25 : 0.8,
                                padding: "2px",
                                display: "flex",
                                color: "#475569",
                              }}
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMove(slider, "down")}
                              disabled={actualIndex === -1 || actualIndex >= sliders.length - 1 || isReordering}
                              aria-label="Move Down"
                              style={{
                                border: "none",
                                background: "none",
                                cursor: actualIndex === -1 || actualIndex >= sliders.length - 1 ? "not-allowed" : "pointer",
                                opacity: actualIndex === -1 || actualIndex >= sliders.length - 1 ? 0.25 : 0.8,
                                padding: "2px",
                                display: "flex",
                                color: "#475569",
                              }}
                            >
                              <ArrowDown size={13} />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Thumbnail Preview */}
                      <td style={{ padding: "14px 16px" }}>
                        <div
                          onClick={() => setPreviewImage(imgSrc)}
                          style={{
                            width: "96px",
                            height: "56px",
                            borderRadius: "8px",
                            overflow: "hidden",
                            position: "relative",
                            cursor: "pointer",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                            background: "#1e293b",
                          }}
                        >
                          <img
                            src={imgSrc}
                            alt={slider.highlight}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: "rgba(0,0,0,0.25)",
                              display: "grid",
                              placeItems: "center",
                              opacity: 0,
                              transition: "opacity 0.2s",
                            }}
                            className="thumb-hover"
                          >
                            <Eye size={16} style={{ color: "#fff" }} />
                          </div>
                        </div>
                      </td>

                      {/* Headline & Tag */}
                      <td style={{ padding: "14px 16px" }}>
                        <div>
                          {slider.tag && (
                            <span
                              style={{
                                display: "inline-block",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                                color: "#4f7d16",
                                background: "#f0fdf4",
                                border: "1px solid #dcfce7",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                marginBottom: "4px",
                              }}
                            >
                              {slider.tag}
                            </span>
                          )}
                          <div style={{ display: "flex", alignItems: "baseline", gap: "5px" }}>
                            <span
                              style={{
                                fontFamily: "serif",
                                fontStyle: "italic",
                                color: "#92400e",
                                fontWeight: 600,
                                fontSize: "0.95rem",
                              }}
                            >
                              {slider.title}
                            </span>
                            <span
                              style={{
                                fontWeight: 800,
                                color: "#0f172a",
                                fontSize: "0.95rem",
                              }}
                            >
                              {slider.highlight}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Subtitle */}
                      <td style={{ padding: "14px 16px", maxWidth: "240px" }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.82rem",
                            color: "#64748b",
                            lineHeight: 1.45,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {slider.subtitle || "—"}
                        </p>
                      </td>

                      {/* Buttons */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.76rem" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#15803d", fontWeight: 600 }}>
                            • {slider.cta} <span style={{ color: "#94a3b8" }}>({slider.href})</span>
                          </span>
                          {(slider.secondary_cta || slider.secondaryCta) && (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#475569" }}>
                              • {slider.secondary_cta || slider.secondaryCta}{" "}
                              <span style={{ color: "#94a3b8" }}>
                                ({slider.secondary_href || slider.secondaryHref})
                              </span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(slider)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "4px 10px",
                            borderRadius: "999px",
                            border: `1px solid ${slider.is_active ? "#bbf7d0" : "#fecaca"}`,
                            background: slider.is_active ? "#f0fdf4" : "#fef2f2",
                            color: slider.is_active ? "#15803d" : "#b91c1c",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                        >
                          <span
                            style={{
                              width: "7px",
                              height: "7px",
                              borderRadius: "50%",
                              background: slider.is_active ? "#22c55e" : "#ef4444",
                            }}
                          />
                          {slider.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                          <Button
                            variant="plain"
                            variant="edit"
                            onClick={() => handleOpenEdit(slider)}
                            title="Edit Slider"
                            aria-label="Edit Slider"
                            style={{ padding: "6px", borderRadius: "6px" }}
                          >
                            <Pencil size={16} />
                          </Button>

                          <Button
                            variant="plain"
                            variant="delete"
                            onClick={() => setSliderToDelete(slider)}
                            title="Delete Slider"
                            aria-label="Delete Slider"
                            style={{ padding: "6px", borderRadius: "6px", color: "#ef4444" }}
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
          total={sliders.length}
          limit={limit}
          onPageChange={setPage}
          itemLabel="sliders"
          className="p-3 border-top"
        />
      </div>

      {/* Add / Edit Slider Modal */}
      <HeroSliderModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingSlider(null);
        }}
        onSubmit={handleSave}
        initialData={editingSlider}
        isSubmitting={isCreating || isUpdating}
      />

      {/* Full-size Image Preview Modal */}
      {previewImage && (
        <div
          className="modal-backdrop"
          onClick={() => setPreviewImage(null)}
          style={{ zIndex: 110 }}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "85vw",
              maxHeight: "85vh",
              borderRadius: "12px",
              overflow: "hidden",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage}
              alt="Full Preview"
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "80vh",
                objectFit: "contain",
                display: "block",
              }}
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "rgba(0,0,0,0.6)",
                border: "none",
                borderRadius: "50%",
                color: "#fff",
                padding: "8px",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
              }}
            >
              <XCircle size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {sliderToDelete && (
        <ConfirmDialog
          title="Delete Hero Slider"
          message={`Are you sure you want to delete the slider "${sliderToDelete.title} ${sliderToDelete.highlight}"? This action cannot be undone.`}
          confirmLabel="Delete Slider"
          onConfirm={handleConfirmDelete}
          onClose={() => setSliderToDelete(null)}
          isLoading={isDeleting}
          danger
        />
      )}
    </>
  );
}

