import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import CmsPageForm from "../../components/forms/CmsPageForm";
import { useCreateAdminCmsPageMutation } from "../../services/cmsApi";

export default function CmsPageCreate() {
  const navigate = useNavigate();
  const [createPage, { isLoading, error }] = useCreateAdminCmsPageMutation();

  const handleSave = async (values) => {
    try {
      await createPage(values).unwrap();
      toast.success("CMS Page created successfully!");
      navigate("/cms-pages");
    } catch (err) {
      if (!err?.data?.errors || Object.keys(err.data.errors).length === 0) {
        toast.error(err?.data?.message || "Failed to create CMS page");
      }
    }
  };

  const backendErrors = error?.data?.errors || {};

  return (
    <>
      <div className="section-head">
        <div>
          <h1>Add CMS Page</h1>
          <p>Create a new policy, informational, or custom content page.</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/cms-pages")}>
          <ArrowLeft size={17} /> Back to pages
        </Button>
      </div>

      <CmsPageForm
        onSubmit={handleSave}
        submitLabel="Create Page"
        isSubmitting={isLoading}
        backendErrors={backendErrors}
      />
    </>
  );
}

