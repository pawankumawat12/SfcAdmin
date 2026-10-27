import { ArrowLeft } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import CmsPageForm from "../../components/forms/CmsPageForm";
import {
  useGetAdminCmsPageByIdQuery,
  useUpdateAdminCmsPageMutation,
} from "../../services/cmsApi";

export default function CmsPageEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading: loading, isError } = useGetAdminCmsPageByIdQuery(id);
  const [updatePage, { isLoading: isUpdating, error: updateError }] =
    useUpdateAdminCmsPageMutation();

  const page = data?.data;

  if (isError) return <Navigate to="/cms-pages" replace />;
  if (loading) return <p className="p-6 text-gray-500">Loading CMS page...</p>;
  if (!page) return <Navigate to="/cms-pages" replace />;

  const handleSave = async (values) => {
    try {
      await updatePage({ id, ...values }).unwrap();
      toast.success("CMS Page updated successfully!");
      navigate("/cms-pages");
    } catch (err) {
      if (!err?.data?.errors || Object.keys(err.data.errors).length === 0) {
        toast.error(err?.data?.message || "Failed to update CMS page");
      }
    }
  };

  const backendErrors = updateError?.data?.errors || {};

  return (
    <>
      <div className="section-head">
        <div>
          <h1>Edit CMS Page</h1>
          <p>Update content and settings for &quot;{page.title}&quot;.</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/cms-pages")}>
          <ArrowLeft size={17} /> Back to pages
        </Button>
      </div>

      <CmsPageForm
        key={page.id}
        initialValues={page}
        onSubmit={handleSave}
        submitLabel="Save Changes"
        isSubmitting={isUpdating}
        backendErrors={backendErrors}
      />
    </>
  );
}

