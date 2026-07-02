import { getWarmReport } from "@/lib/warm-report";
import { WarmReportRenderer } from "@/components/warm-report-renderer";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CaldReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { slug } = await params;
  const { print } = await searchParams;
  const d = await getWarmReport(slug);
  if (!d) notFound();

  return (
    <>
      <WarmReportRenderer d={d} />
      {print !== "1" && (
        <a
          href={`/cald/${slug}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 50,
            display: "inline-flex", alignItems: "center", gap: 9,
            padding: "16px 34px", borderRadius: 999, color: "#fff", fontWeight: 800,
            fontFamily: "var(--font-sora), system-ui, sans-serif", fontSize: 16.5,
            textDecoration: "none", boxShadow: "0 12px 34px rgba(10,190,207,0.5)",
            background: "linear-gradient(135deg,#47499E,#0ABECF)",
          }}
        >
          ⬇ Descarca PDF
        </a>
      )}
    </>
  );
}
