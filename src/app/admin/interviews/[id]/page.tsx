import { notFound } from "next/navigation";
import AdminInterviewForm from "@/components/admin-interview-form";

type AdminInterviewDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminInterviewDetailPage({
  params,
}: AdminInterviewDetailPageProps) {
  const { id } = await params;
  const interviewId = Number(id);

  if (!Number.isInteger(interviewId) || interviewId <= 0) {
    notFound();
  }

  return <AdminInterviewForm interviewId={interviewId} />;
}
