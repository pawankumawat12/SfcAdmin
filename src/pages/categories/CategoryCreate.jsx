import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import CategoryForm from "../../components/forms/CategoryForm";
import Button from "../../components/ui/Button";
import {
  useCreateCategoryMutation,
  useGetCategoriesQuery,
} from "../../services/categoryApi";

export default function CategoryCreate() {
  const navigate = useNavigate();
  const { data: categoryResponse, isLoading: categoriesLoading } =
    useGetCategoriesQuery({ limit: 100 });
  const [createCategory, { isLoading, error }] = useCreateCategoryMutation();

  const save = async (data) => {
    try {
      await createCategory(data).unwrap();
      toast.success("Category created successfully!");
      navigate("/categories");
    } catch {
      // The API error is shown inline below
    }
  };

  return (
    <>
      <div className="section-head">
        <div>
          <h1>Add category</h1>
          <p>Create a new group for your menu.</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/categories")}>
          <ArrowLeft size={17} /> Back to categories
        </Button>
      </div>
      {categoriesLoading ? <p>Loading categories...</p> : (
        <>
          <CategoryForm
            categories={categoryResponse?.data || []}
            initialValues={{ name: "", description: "", parentCategoryId: "", status: "Active" }}
            onSubmit={save}
            submitLabel="Create category"
            isSubmitting={isLoading}
          />
          {error && error.status !== 401 && (
            <p className="error">
              {error.data?.errors
                ? Object.entries(error.data.errors)
                    .map(([field, msg]) => `${field}: ${msg}`)
                    .join(" | ")
                : error.data?.message || "Unable to create category"}
            </p>
          )}
        </>
      )}
    </>
  );
}
