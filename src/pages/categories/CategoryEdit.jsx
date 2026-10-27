import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import CategoryForm from "../../components/forms/CategoryForm";
import Button from "../../components/ui/Button";
import {
  useGetCategoriesQuery,
  useGetCategoryQuery,
  useUpdateCategoryMutation,
} from "../../services/categoryApi";

export default function CategoryEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: categoryResponse, isLoading: categoryLoading, isError } = useGetCategoryQuery(id);
  const { data: categoriesResponse, isLoading: categoriesLoading } = useGetCategoriesQuery({ limit: 100 });
  const [updateCategory, { isLoading, error }] = useUpdateCategoryMutation();
  const category = categoryResponse?.data;

  if (isError) return <Navigate to="/categories" replace />;
  if (categoryLoading || categoriesLoading) return <p>Loading category...</p>;
  if (!category) return <Navigate to="/categories" replace />;

  const save = async (data) => {
    try {
      await updateCategory({ id, ...data }).unwrap();
      toast.success("Category updated successfully!");
      navigate("/categories");
    } catch {
      // The API error is shown inline below
    }
  };

  return (
    <>
      <div className="section-head">
        <div>
          <h1>Edit category</h1>
          <p>Update {category.name}.</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/categories")}>
          <ArrowLeft size={17} /> Back to categories
        </Button>
      </div>
      <CategoryForm
        categories={(categoriesResponse?.data || []).filter((item) => item.id !== category.id)}
        initialValues={{
          name: category.name,
          description: category.description || "",
          parentCategoryId: category.parent_category_id ? String(category.parent_category_id) : "",
          status: category.is_active ? "Active" : "Inactive",
        }}
        existingImage={category.image}
        onSubmit={save}
        submitLabel="Save changes"
        isSubmitting={isLoading}
      />
      {error && error.status !== 401 && (
        <p className="error">
          {error.data?.errors
            ? Object.entries(error.data.errors)
                .map(([field, msg]) => `${field}: ${msg}`)
                .join(" | ")
            : error.data?.message || "Unable to update category"}
        </p>
      )}
    </>
  );
}
