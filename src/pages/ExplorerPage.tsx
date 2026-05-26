import { useMemo, useState } from "react";

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

const normalizeUrl = (u: unknown) => {
  const s = String(u ?? "").trim();
  if (!s) return "";
  return s.startsWith("http://") || s.startsWith("https://") ? s : `https://${s}`;
};

export default function ExplorerPage({ grants, totalGrants, q }: ExplorerPageProps) {
  type ViewMode = "sheet" | "cards";
  const [view, setView] = useState<ViewMode>("sheet");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const rowKey = (g: any, idx: number) =>
    g.id ?? `${g["Project Title"] ?? "grant"}-${idx}`;

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
        <div className="resultsToolbar">
          <div className="resultsButtons">
            <button className="btn">Download</button>
            <button
              type="button"
              className="toggleCardButton"
              onClick={() => setView((v) => (v === "sheet" ? "cards" : "sheet"))}
              aria-pressed={view === "cards"}
              title={view === "sheet" ? "Switch to cards" : "Switch to sheet"}
            >
              {view === "sheet" ? "Cards" : "Sheet"}
            </button>
          </div>
        </div>
      </div>

      <div className="canvasBody">
        {view === "sheet" ? (
          <div className="grantSheet">
            <div className="grantSheetHeader">
              <div className="col title">Title</div>
              <div className="col year">Year</div>
              <div className="col agency">Agency</div>
              <div className="col amount">Amount</div>
              <div className="col state">State</div>
              <div className="col mechanism">Mechanism</div>
              <div className="col link">Link</div>
            </div>

            {grants.map((g: any, idx: number) => {
              const key = rowKey(g, idx);
              const isExpanded = expandedKey === key;
              const toggle = () => setExpandedKey(isExpanded ? null : key);
              return (
                <div
                  className={`grantRow${isExpanded ? " expanded" : ""}`}
                  key={key}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onClick={toggle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggle();
                    }
                  }}
                >
                  <div className="cell title" title={g["Project Title"] ?? ""}>
                    {g["Project Title"] ?? "(untitled)"}
                  </div>
                  <div className="cell year">{g["Fiscal Year"] ?? "—"}</div>
                  <div className="cell agency">{g["Agency"] ?? "—"}</div>
                  <div className="cell amount">
                    {g["Amount"] != null ? formatUsd(parseAmount(g["Amount"])) : "—"}
                  </div>
                  <div className="cell state">{g["State"] ?? "—"}</div>
                  <div className="cell mechanism" title={g["Mechanism"] ?? ""}>
                    {g["Mechanism"] ?? "—"}
                  </div>
                  <div className="cell link" onClick={(e) => e.stopPropagation()}>
                    {g["URL"] ? (
                      <a
                        className="pillLink"
                        href={normalizeUrl(g["URL"])}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                    ) : (
                      <span style={{ opacity: 0.6 }}>—</span>
                    )}
                  </div>

                  {isExpanded ? (
                    <div className="grantRowExpanded">
                      <div className="grantRowExpandedDetails">
                        <div><span className="label">PI:</span> {g["PI"] ?? "—"}</div>
                        <div><span className="label">Org:</span> {g["Organization"] ?? "—"}</div>
                        <div><span className="label">Agency IC:</span> {g["Agency IC"] ?? "—"}</div>
                        <div><span className="label">Mechanism:</span> {g["Mechanism"] ?? "—"}</div>
                      </div>
                      {g["Project Abstract"] ? (
                        <div className="grantRowExpandedAbstract">
                          {String(g["Project Abstract"]).slice(0, 600)}
                          {String(g["Project Abstract"]).length > 600 ? "…" : ""}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grantCards">
            {grants.map((g: any, idx: number) => (
              <div
                className="grantCard"
                key={g.id ?? `${g["Project Title"] ?? "grant"}-${idx}`}
              >
                <div className="grantCardTop">
                  <div
                    className="grantCardTitle"
                    title={g["Project Title"] ?? ""}
                  >
                    {g["Project Title"] ?? "(untitled)"}
                  </div>
                  <div className="grantCardMeta">
                    <span className="num">{g["Fiscal Year"] ?? "—"}</span>
                    <span>•</span>
                    <span>
                      {g["Agency"] ?? "—"}
                      {g["Agency IC"] ? ` / ${g["Agency IC"]}` : ""}
                    </span>
                    {g["Amount"] != null ? (
                      <>
                        <span>•</span>
                        <span className="num">
                          {formatUsd(parseAmount(g["Amount"]))}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="grantCardDetails">
                  <div><span className="label">PI:</span> {g["PI"] ?? "—"}</div>
                  <div><span className="label">Org:</span> {g["Organization"] ?? "—"}</div>
                  <div><span className="label">State:</span> {g["State"] ?? "—"}</div>
                  <div><span className="label">Mechanism:</span> {g["Mechanism"] ?? "—"}</div>
                </div>

                {g["Project Abstract"] ? (
                  <div className="grantCardAbstract">
                    {String(g["Project Abstract"]).slice(0, 240)}
                    {String(g["Project Abstract"]).length > 240 ? "…" : ""}
                  </div>
                ) : null}

                <div className="grantCardBottom">
                  {g["Readiness - General"] ? (
                    <span className="tag">{g["Readiness - General"]}</span>
                  ) : null}
                  {g["Intervention - General"] ? (
                    <span className="tag">{g["Intervention - General"]}</span>
                  ) : null}
                  <span className="spacer" />
                  {g["URL"] ? (
                    <a
                      className="btnLink"
                      href={normalizeUrl(g["URL"])}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Grant
                    </a>
                  ) : (
                    <span style={{ opacity: 0.6 }}>No link</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
