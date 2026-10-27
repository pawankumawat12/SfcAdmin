import { useState, useMemo } from "react";
import {
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  Eye,
  Ban,
  Filter,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import DataTable from "../../components/common/DataTable";
import BulkActionBar from "../../components/common/BulkActionBar";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Button from "../../components/ui/Button";
import SearchInput from "../../components/ui/SearchInput";
import Select from "../../components/ui/Select";
import Pagination from "../../components/ui/Pagination";
import useDebouncedValue from "../../utils/useDebouncedValue";
import {
  useGetAdminCmsPagesQuery,
  useDeleteAdminCmsPageMutation,
  useBulkStatusAdminCmsPagesMutation,
  useBulkDeleteAdminCmsPagesMutation,
} from "../../services/cmsApi";

export default function CmsPageList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pageToDelete, setPageToDelete] = useState(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search);

  const queryParams = useMemo(
    () => ({
      page,
      limit: 10,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    }),
    [page, debouncedSearch, statusFilter]
  );

  const { data, isLoading, error } = useGetAdminCmsPagesQuery(queryParams);
  const [deleteCmsPage, { isLoading: isDeleting, error: deleteError }] =
    useDeleteAdminCmsPageMutation();
  const [bulkStatus, { isLoading: isBulkUpdating }] =
    useBulkStatusAdminCmsPagesMutation();
  const [bulkDelete, { isLoading: isBulkDeleting }] =
    useBulkDeleteAdminCmsPagesMutation();

  const pages = data?.data || [];
  const pagination = data?.pagination;

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(pages.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id, checked) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const confirmSingleDelete = async () => {
    if (!pageToDelete) return;
    try {
      await deleteCmsPage(pageToDelete.id).unwrap();
      toast.success(`Page '${pageToDelete.title}' deleted`);
      setPageToDelete(null);
      setSelectedIds((prev) => prev.filter((id) => id !== pageToDelete.id));
    } catch {
      // The API error is rendered inside the ConfirmDialog via error prop
    }
  };

  const handleBulkStatus = async (status) => {
    if (selectedIds.length === 0) return;
    try {
      await bulkStatus({ ids: selectedIds, status }).unwrap();
      toast.success(
        `Updated ${selectedIds.length} page(s) to ${status}`
      );
      setSelectedIds([]);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update pages");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await bulkDelete({ ids: selectedIds }).unwrap();
      toast.success(`Deleted ${selectedIds.length} page(s)`);
      setSelectedIds([]);
      setBulkDeleteConfirmOpen(false);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete selected pages");
    }
  };

  const frontendBaseUrl =
    (import.meta.env.VITE_FRONTEND_URL || "http://localhost:3000").replace(
      /\/+$/,
      ""
    );

  return (
    <>
      <div className="section-head">
        <div>
          <h1>CMS Pages</h1>
          <p>
            Create and manage public pages like About Us, Policies, and FAQ.
          </p>
        </div>
        <Button onClick={() => navigate("/cms-pages/create")}>
          <Plus size={18} /> Add Page
        </Button>
      </div>

      <div className="card table-card">
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by title or slug..."
          />
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{ minWidth: "140px" }}
            >
              <option value="">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </Select>
          </div>
        </div>

        {error && (
          <p className="error table-error">
            {error.data?.message || "Unable to load CMS pages"}
          </p>
        )}

        {selectedIds.length > 0 && (
          <BulkActionBar
            selectedCount={selectedIds.length}
            onClearSelection={() => setSelectedIds([])}
            itemLabel="pages"
          >
            <Button
              variant="outline"
              onClick={() => handleBulkStatus("published")}
              disabled={isBulkUpdating}
              style={{ fontSize: "13px", padding: "5px 10px" }}
            >
              <CheckCircle size={14} color="#16a34a" /> Publish
            </Button>
            <Button
              variant="outline"
              onClick={() => handleBulkStatus("draft")}
              disabled={isBulkUpdating}
              style={{ fontSize: "13px", padding: "5px 10px" }}
            >
              <Clock size={14} color="#f59e0b" /> Move to Draft
            </Button>
            <Button
              variant="danger"
              onClick={() => setBulkDeleteConfirmOpen(true)}
              disabled={isBulkDeleting}
              style={{ fontSize: "13px", padding: "5px 10px" }}
            >
              <Trash2 size={14} /> Delete Selected
            </Button>
          </BulkActionBar>
        )}

        <DataTable
          loading={isLoading}
          data={pages}
          emptyMessage="No CMS pages found."
          selectable={true}
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelectRow={handleSelectRow}
          columns={[
            {
              key: "title",
              label: "PAGE TITLE",
              render: (value, page) => (
                <div>
                  <b style={{ color: "#111827", fontSize: "14px" }}>{value}</b>
                  {page.seoTitle && (
                    <div style={{ fontSize: "11px", color: "#6b7280" }}>
                      SEO: {page.seoTitle}
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: "slug",
              label: "SLUG",
              render: (value) => (
                <code
                  style={{
                    background: "#f3f4f6",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    color: "#374151",
                  }}
                >
                  /{value}
                </code>
              ),
            },
            {
              key: "status",
              label: "STATUS",
              render: (value) => (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "3px 8px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "600",
                    background: value === "published" ? "#dcfce7" : "#fef3c7",
                    color: value === "published" ? "#15803d" : "#b45309",
                  }}
                >
                  {value === "published" ? (
                    <CheckCircle size={12} />
                  ) : (
                    <Clock size={12} />
                  )}
                  {value === "published" ? "Published" : "Draft"}
                </span>
              ),
            },
            {
              key: "isActive",
              label: "VISIBILITY",
              render: (value) => (
                <em className={value ? "active" : "inactive"}>
                  {value ? "Active" : "Inactive"}
                </em>
              ),
            },
            {
              key: "updatedAt",
              label: "LAST UPDATED",
              render: (value) =>
                value ? new Date(value).toLocaleDateString() : "—",
            },
          ]}
          renderActions={(page) => (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <a
                href={`${frontendBaseUrl}/${page.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`Preview /${page.slug} on storefront`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "30px",
                  height: "30px",
                  borderRadius: "6px",
                  border: "1px solid #e5e7eb",
                  color: "#4b5563",
                  background: "#fff",
                }}
              >
                <ExternalLink size={14} />
              </a>
              <Button
                variant="edit"
                title={`Edit ${page.title}`}
                aria-label={`Edit ${page.title}`}
                onClick={() => navigate(`/cms-pages/${page.id}/edit`)}
              >
                <Pencil size={15} />
              </Button>
              <Button
                variant="delete"
                title={`Delete ${page.title}`}
                aria-label={`Delete ${page.title}`}
                onClick={() => setPageToDelete(page)}
              >
                <Trash2 size={15} />
              </Button>
            </div>
          )}
        />

        <Pagination
          page={pagination?.page || page}
          totalPages={pagination?.totalPages || 1}
          total={pagination?.total || 0}
          limit={10}
          onPageChange={setPage}
          itemLabel="pages"
        />
      </div>

      {/* Delete Single Page Dialog */}
      {pageToDelete && (
        <ConfirmDialog
          title="Delete CMS Page?"
          message={`Are you sure you want to delete '${pageToDelete.title}'? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmSingleDelete}
          onClose={() => setPageToDelete(null)}
          isLoading={isDeleting}
          error={deleteError?.data?.message}
        />
      )}

      {/* Bulk Delete Dialog */}
      {bulkDeleteConfirmOpen && (
        <ConfirmDialog
          title="Delete Selected CMS Pages?"
          message={`Are you sure you want to delete ${selectedIds.length} page(s)? This action cannot be undone.`}
          confirmLabel="Delete All Selected"
          onConfirm={handleBulkDelete}
          onClose={() => setBulkDeleteConfirmOpen(false)}
          isLoading={isBulkDeleting}
        />
      )}
    </>
  );
}

