import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Download, Phone, Mail } from "lucide-react";
import toast from "react-hot-toast";
import DataTable from "../../components/common/DataTable";
import Button from "../../components/ui/Button";
import SearchInput from "../../components/ui/SearchInput";
import Pagination from "../../components/ui/Pagination";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import useDebouncedValue from "../../utils/useDebouncedValue";
import { exportToCsv } from "../../utils/csvExport";
import {
  useGetSuppliersQuery,
  useDeleteSupplierMutation,
} from "../../services/inventoryApi";
import SupplierModal from "../../modals/SupplierModal";

export default function SupplierList() {
  const [searchText, setSearchText] = useState("");
  const debouncedQuery = useDebouncedValue(searchText);

  const [page, setPage] = useState(1);
  const [limit] = useState(15);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierToDelete, setSupplierToDelete] = useState(null);

  const params = useMemo(
    () => ({
      page,
      limit,
      ...(debouncedQuery.trim() ? { search: debouncedQuery.trim() } : {}),
    }),
    [page, limit, debouncedQuery]
  );

  const { data: response, isLoading, error, refetch } = useGetSuppliersQuery(params);
  const suppliers = response?.data || [];
  const pagination = response?.pagination;

  const [deleteSupplier, { isLoading: isDeleting }] = useDeleteSupplierMutation();

  const handleEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!supplierToDelete) return;
    try {
      await deleteSupplier(supplierToDelete.id).unwrap();
      toast.success("Supplier deleted successfully");
      setSupplierToDelete(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete supplier");
    }
  };

  const handleExportAll = () => {
    exportToCsv({
      filename: `suppliers-${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { key: "name", label: "Supplier Name" },
        { key: "contact_person", label: "Contact Person" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "gstin", label: "GSTIN" },
        { key: "address", label: "Address" },
        {
          key: "is_active",
          label: "Status",
          getValue: (r) => (r.is_active ? "Active" : "Inactive"),
        },
      ],
      data: suppliers,
    });
    toast.success(`Exported ${suppliers.length} suppliers to CSV`);
  };

  const columns = [
    {
      key: "name",
      label: "SUPPLIER / COMPANY",
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--ink, #1f2937)" }}>{row.name}</div>
          {row.address && (
            <small style={{ color: "var(--muted, #6d6c80)", fontSize: "11px" }}>
              {row.address}
            </small>
          )}
        </div>
      ),
    },
    {
      key: "contact_person",
      label: "CONTACT PERSON",
      render: (val) => val || <span style={{ color: "var(--muted)", fontStyle: "italic" }}>None</span>,
    },
    {
      key: "contact_info",
      label: "PHONE / EMAIL",
      render: (_, row) => (
        <div style={{ fontSize: "12px", lineHeight: "1.4" }}>
          {row.phone && (
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Phone size={12} color="var(--muted)" />
              <span>{row.phone}</span>
            </div>
          )}
          {row.email && (
            <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "var(--muted)" }}>
              <Mail size={12} />
              <span>{row.email}</span>
            </div>
          )}
          {!row.phone && !row.email && (
            <span style={{ color: "var(--muted)", fontStyle: "italic" }}>No details</span>
          )}
        </div>
      ),
    },
    {
      key: "gstin",
      label: "GSTIN / TAX ID",
      render: (val) => (
        <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--muted)" }}>
          {val || "—"}
        </span>
      ),
    },
    {
      key: "is_active",
      label: "STATUS",
      render: (val) => (
        <em className={val ? "active" : "inactive"}>{val ? "Active" : "Inactive"}</em>
      ),
    },
  ];

  return (
    <>
      <div className="section-head">
        <div>
          <h1>Suppliers & Vendors</h1>
          <p>Manage raw material suppliers, vendor contacts, and billing tax details.</p>
        </div>
        <Button
          onClick={() => {
            setSelectedSupplier(null);
            setIsModalOpen(true);
          }}
        >
          <Plus size={18} /> Add Supplier
        </Button>
      </div>

      <div className="card table-card">
        <div className="table-toolbar">
          <SearchInput
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
            placeholder="Search supplier by name, phone, or contact..."
          />
          <Button
            variant="outline"
            onClick={handleExportAll}
            title="Export suppliers as CSV"
          >
            <Download size={16} /> Export CSV
          </Button>
        </div>

        {error && (
          <p className="error table-error">
            {error.data?.message || "Unable to load suppliers"}
          </p>
        )}

        <DataTable
          loading={isLoading}
          columns={columns}
          data={suppliers}
          emptyMessage="No suppliers found."
          renderActions={(supplier) => (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Button
                variant="edit"
                title={`Edit ${supplier.name}`}
                aria-label={`Edit ${supplier.name}`}
                onClick={() => handleEdit(supplier)}
              >
                <Pencil size={15} />
              </Button>
              <Button
                variant="delete"
                title={`Delete ${supplier.name}`}
                aria-label={`Delete ${supplier.name}`}
                onClick={() => setSupplierToDelete(supplier)}
              >
                <Trash2 size={15} />
              </Button>
            </div>
          )}
        />

        {pagination && (
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={setPage}
            itemLabel="suppliers"
          />
        )}
      </div>

      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSupplier(null);
        }}
        supplier={selectedSupplier}
        onSuccess={() => refetch()}
      />

      {supplierToDelete && (
        <ConfirmDialog
          title="Delete Supplier"
          message={`Are you sure you want to delete supplier "${supplierToDelete.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onClose={() => setSupplierToDelete(null)}
          isLoading={isDeleting}
        />
      )}
    </>
  );
}
