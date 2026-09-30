import { useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Video,
  Play,
  Layers,
  CheckCircle2,
  XCircle,
  ExternalLink,
  X,
  Film,
} from "lucide-react";
import { FaYoutube, FaInstagram } from "react-icons/fa";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import SearchInput from "../../components/ui/SearchInput";
import Select from "../../components/ui/Select";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import ReelModal from "./ReelModal";
import useDebouncedValue from "../../utils/useDebouncedValue";
import {
  useGetAdminReelsQuery,
  useCreateReelMutation,
  useUpdateReelMutation,
  useToggleReelStatusMutation,
  useReorderReelsMutation,
  useDeleteReelMutation,
} from "../../services/reelApi";

function extractEmbedUrl(url = "", platform = "youtube") {
  if (!url) return "";
  if (platform === "instagram" || /instagram\.com/i.test(url)) {
    const cleanUrl = url.split("?")[0].replace(/\/+$/, "");
    return `${cleanUrl}/embed`;
  }
  const ytMatch = url.match(/(?:shorts\/|v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
  }
  return url;
}

export default function ReelsList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const debouncedSearch = useDebouncedValue(search, 300);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [previewVideo, setPreviewVideo] = useState(null);

  // Queries & Mutations
  const { data, isLoading, error } = useGetAdminReelsQuery();
  const [createReel, { isLoading: isCreating }] = useCreateReelMutation();
  const [updateReel, { isLoading: isUpdating }] = useUpdateReelMutation();
  const [toggleStatus, { isLoading: isToggling }] = useToggleReelStatusMutation();
  const [reorderReels, { isLoading: isReordering }] = useReorderReelsMutation();
  const [deleteReel, { isLoading: isDeleting }] = useDeleteReelMutation();

  const reels = useMemo(() => data?.data || [], [data]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: reels.length,
      active: reels.filter((r) => r.is_active).length,
      inactive: reels.filter((r) => !r.is_active).length,
      youtube: reels.filter((r) => r.platform === "youtube").length,
      instagram: reels.filter((r) => r.platform === "instagram").length,
    };
  }, [reels]);

  // Filtered list
  const filteredReels = useMemo(() => {
    return reels.filter((r) => {
      const matchesSearch =
        debouncedSearch === "" ||
        r.title?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        r.video_url?.toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? r.is_active
          : !r.is_active;

      const matchesPlatform =
        platformFilter === "all" ? true : r.platform === platformFilter;

      return matchesSearch && matchesStatus && matchesPlatform;
    });
  }, [reels, debouncedSearch, statusFilter, platformFilter]);

  // Handlers
  const handleOpenAdd = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (reel) => {
    setEditingItem(reel);
    setModalOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingItem) {
        await updateReel({ id: editingItem.id, formData }).unwrap();
        toast.success("Reel updated successfully!");
      } else {
        await createReel(formData).unwrap();
        toast.success("Reel created successfully!");
      }
      setModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save reel.");
    }
  };

  const handleToggleStatus = async (reel) => {
    try {
      await toggleStatus({ id: reel.id, is_active: !reel.is_active }).unwrap();
      toast.success(
        `Reel ${!reel.is_active ? "activated" : "deactivated"} successfully`
      );
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update status.");
    }
  };

  const handleMove = async (index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= reels.length) return;

    const reordered = [...reels];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const orderedIds = reordered.map((r) => r.id);
    try {
      await reorderReels(orderedIds).unwrap();
      toast.success("Order updated successfully");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to reorder reels.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await deleteReel(itemToDelete.id).unwrap();
      toast.success("Reel deleted successfully");
      setItemToDelete(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete reel.");
    }
  };

  return (
    <>
      {/* Section Head */}
      <div className="section-head">
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Video size={26} style={{ color: "#8b5cf6" }} />
            Reels & Video Slider
          </h1>
          <p>
            Add YouTube Shorts or Instagram Reels to showcase on Home and Menu page video sliders.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus size={18} /> Add New Reel
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
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            cursor: "default",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "#f3e8ff",
              display: "grid",
              placeItems: "center",
              color: "#7e22ce",
            }}
          >
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
              Total Reels
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
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            cursor: "default",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "#dcfce7",
              display: "grid",
              placeItems: "center",
              color: "#15803d",
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
              Active (Live)
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#15803d" }}>
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
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            cursor: "default",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "#fee2e2",
              display: "grid",
              placeItems: "center",
              color: "#dc2626",
            }}
          >
            <FaYoutube size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
              YouTube
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#dc2626" }}>
              {stats.youtube}
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
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            cursor: "default",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "#fce7f3",
              display: "grid",
              placeItems: "center",
              color: "#be185d",
            }}
          >
            <FaInstagram size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
              Instagram
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#be185d" }}>
              {stats.instagram}
            </div>
          </div>
        </div>
      </div>

      {/* Table Toolbar */}
      <div className="table-toolbar">
        <div style={{ flex: 1, minWidth: "220px", maxWidth: "340px" }}>
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch("")}
            placeholder="Search by title or link..."
          />
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <Select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            style={{ minWidth: "140px" }}
          >
            <option value="all">All Platforms</option>
            <option value="direct">Direct MP4 Video</option>
            <option value="youtube">YouTube</option>
            <option value="instagram">Instagram</option>
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ minWidth: "130px" }}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </Select>
        </div>
      </div>

      {/* Data Table */}
      <div className="card table-wrap" style={{ padding: 0, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ padding: "12px 16px", width: "80px", textAlign: "center" }}>Order</th>
              <th style={{ padding: "12px 16px", width: "100px" }}>Cover</th>
              <th style={{ padding: "12px 16px" }}>Reel Title & Link</th>
              <th style={{ padding: "12px 16px", width: "140px" }}>Platform</th>
              <th style={{ padding: "12px 16px", width: "110px", textAlign: "center" }}>Status</th>
              <th style={{ padding: "12px 16px", width: "120px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                  Loading reels...
                </td>
              </tr>
            ) : filteredReels.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                  {search || statusFilter !== "all" || platformFilter !== "all"
                    ? "No reels match your search filters."
                    : "No reels found. Click \"Add New Reel\" to get started!"}
                </td>
              </tr>
            ) : (
              filteredReels.map((reel, index) => (
                <tr key={reel.id}>
                  {/* Order & Up/Down Arrows */}
                  <td style={{ padding: "14px 16px", textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
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
                        {reel.sort_order ?? index + 1}
                      </span>

                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <Button
                          variant="action"
                          disabled={index === 0 || isReordering}
                          onClick={() => handleMove(index, "up")}
                          title="Move Up"
                          aria-label="Move Up"
                          style={{ width: "20px", height: "14px", padding: 0, minWidth: 0 }}
                        >
                          <ArrowUp size={11} />
                        </Button>
                        <Button
                          variant="action"
                          disabled={index === reels.length - 1 || isReordering}
                          onClick={() => handleMove(index, "down")}
                          title="Move Down"
                          aria-label="Move Down"
                          style={{ width: "20px", height: "14px", padding: 0, minWidth: 0 }}
                        >
                          <ArrowDown size={11} />
                        </Button>
                      </div>
                    </div>
                  </td>

                  {/* Thumbnail */}
                  <td style={{ padding: "14px 16px" }}>
                    <div
                      onClick={() => setPreviewVideo(reel)}
                      title="Click to preview video"
                      style={{
                        position: "relative",
                        width: "48px",
                        height: "72px",
                        borderRadius: "8px",
                        overflow: "hidden",
                        background: "#0f172a",
                        cursor: "pointer",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                      }}
                    >
                      {reel.thumbnail_url ? (
                        <img
                          src={reel.thumbnail_url}
                          alt={reel.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "grid",
                            placeItems: "center",
                            color: "#94a3b8",
                          }}
                        >
                          <Video size={18} />
                        </div>
                      )}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(0,0,0,0.35)",
                          display: "grid",
                          placeItems: "center",
                          color: "#fff",
                        }}
                      >
                        <Play size={14} fill="#fff" />
                      </div>
                    </div>
                  </td>

                  {/* Title & Link */}
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.92rem" }}>
                      {reel.title}
                    </div>
                    <a
                      href={reel.video_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "0.78rem",
                        color: "#6366f1",
                        marginTop: "3px",
                        textDecoration: "none",
                        maxWidth: "320px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span>{reel.video_url}</span>
                      <ExternalLink size={10} />
                    </a>
                  </td>

                  {/* Platform */}
                  <td style={{ padding: "14px 16px" }}>
                    {reel.platform === "direct" ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          background: "#ecfdf5",
                          color: "#059669",
                          padding: "3px 8px",
                          borderRadius: "14px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        <Film size={12} /> Direct MP4
                      </span>
                    ) : reel.platform === "instagram" ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          background: "#fce7f3",
                          color: "#be185d",
                          padding: "3px 8px",
                          borderRadius: "14px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        <FaInstagram /> Instagram
                      </span>
                    ) : (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          background: "#fee2e2",
                          color: "#dc2626",
                          padding: "3px 8px",
                          borderRadius: "14px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        <FaYoutube /> YouTube
                      </span>
                    )}
                  </td>

                  {/* Status Toggle */}
                  <td style={{ padding: "14px 16px", textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(reel)}
                      disabled={isToggling}
                      className={`badge ${reel.is_active ? "success" : "danger"}`}
                      style={{ cursor: "pointer", border: "none" }}
                      title="Click to toggle status"
                    >
                      {reel.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <div className="table-actions" style={{ justifyContent: "flex-end" }}>
                      <Button
                        variant="action"
                        onClick={() => setPreviewVideo(reel)}
                        title="Preview Video"
                        aria-label="Preview Video"
                      >
                        <Play size={14} />
                      </Button>
                      <Button
                        variant="action"
                        onClick={() => handleOpenEdit(reel)}
                        title="Edit Reel"
                        aria-label="Edit Reel"
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="action"
                        onClick={() => setItemToDelete(reel)}
                        title="Delete Reel"
                        aria-label="Delete Reel"
                        style={{ color: "#ef4444" }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      <ReelModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingItem}
        isSubmitting={isCreating || isUpdating}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Reel"
        message={`Are you sure you want to delete "${itemToDelete?.title}"? This cannot be undone.`}
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        variant="danger"
      />

      {/* Video Preview Modal */}
      {previewVideo && (
        <div
          className="modal-backdrop"
          onClick={() => setPreviewVideo(null)}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(400px, calc(100vw - 32px))",
              background: "#09090b",
              color: "#fff",
              padding: 0,
              overflow: "hidden",
              borderRadius: "18px",
              boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                background: "#18181b",
              }}
            >
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "300px",
                }}
              >
                {previewVideo.title}
              </span>
              <Button
                variant="plain"
                onClick={() => setPreviewVideo(null)}
                style={{ color: "#fff", padding: "4px" }}
              >
                <X size={18} />
              </Button>
            </div>

            <div style={{ position: "relative", width: "100%", aspectRatio: "9/16", background: "#000" }}>
              {previewVideo.platform === "direct" || /\.(mp4|webm|mov)(\?.*)?$/i.test(previewVideo.video_url || "") ? (
                <video
                  src={previewVideo.video_url}
                  controls
                  autoPlay
                  loop
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                <iframe
                  src={extractEmbedUrl(previewVideo.video_url, previewVideo.platform)}
                  title={previewVideo.title}
                  style={{ width: "100%", height: "100%", border: 0 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

