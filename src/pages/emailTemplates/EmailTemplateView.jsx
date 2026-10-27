import { ArrowLeft, Pencil } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import { useGetEmailTemplateQuery } from "../../services/emailTemplateApi";

export default function EmailTemplateView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useGetEmailTemplateQuery(id);
  const template = data?.data;

  if (isError) return <Navigate to="/email-templates" replace />;
  if (isLoading) return <p>Loading email template...</p>;
  if (!template) return <Navigate to="/email-templates" replace />;

  return (
    <>
      <div className="section-head"><div><h1>{template.name}</h1><p>Preview the saved email template.</p></div><div className="d-flex gap-2"><Button variant="outline" onClick={() => navigate("/email-templates")}><ArrowLeft size={17} /> Back</Button><Button onClick={() => navigate(`/email-templates/${id}/edit`)}><Pencil size={16} /> Edit</Button></div></div>
      <section className="card email-template-detail">
        <div className="template-meta"><div><span>Slug</span><strong>{template.slug}</strong></div><div><span>Status</span><strong className={template.isActive ? "active" : "inactive"}>{template.isActive ? "Active" : "Inactive"}</strong></div></div>
        <h2>{template.subject}</h2>
        {template.description && <p className="muted">{template.description}</p>}
        <iframe
          title={`${template.name} preview`}
          sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          srcDoc={`<!DOCTYPE html><html><head><base target="_blank" /></head><body>${template.body}</body></html>`}
          className="email-template-preview"
        />
      </section>
    </>
  );
}
