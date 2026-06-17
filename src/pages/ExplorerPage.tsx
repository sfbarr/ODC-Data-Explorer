import { useMemo } from "react";
import GrantsView from "../components/GrantsView";
import { todaySlug } from "../utils/download";

type ExplorerPageProps = {
  grants: any[];       // pre-filtered by App
  totalGrants: number; // total unfiltered count for "X of Y" display
  q: string;           // current search query for display echo
};

const formatUsd = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const parseAmount = (v: unknown) => {
  if (typeof v === "number") return v;
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export default function ExplorerPage({ grants, totalGrants, q }: ExplorerPageProps) {
  const totalFunding = useMemo(() => {
    let total = 0;
    grants.forEach((g: any) => {
      total += parseAmount(g?.["Amount"] ?? g?.Amount);
    });
    return formatUsd(total);
  }, [grants]);

  return (
    <main className="canvas">
      <div className="canvasHeader">
        <div className="canvasTitle">Explorer</div>
        <div className="resultsSummary">
          <strong>{grants.length}</strong> of <strong>{totalGrants}</strong> grants shown
          {q.trim() ? (
            <span style={{ marginLeft: "0.75rem", opacity: 0.8 }}>
              Search:&ensp;<code>{q.trim()}</code>
            </span>
          ) : null}
          <div className="fundingTotal">{totalFunding}</div>
        </div>
      </div>

      <div className="canvasBody">
        <GrantsView grants={grants} downloadFilename={`sci-grants-${todaySlug()}.csv`} />
      </div>
    </main>
  );
}
