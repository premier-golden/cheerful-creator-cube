import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listSaleAttributions,
  type SaleAttributionRow,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Sales attribution dashboard | Nutrion Life" },
      {
        name: "description",
        content:
          "Internal dashboard with the campaign source (UTM) behind each Nutrion Life sale, updated in real time.",
      },
      { property: "og:title", content: "Sales attribution dashboard" },
      {
        property: "og:description",
        content:
          "Internal dashboard with the campaign source behind each Nutrion Life sale.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

const STORAGE_KEY = "nl_admin_pass";

function money(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { timeZone: "UTC" });
}

function AdminPage() {
  const fetchRows = useServerFn(listSaleAttributions);

  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [rows, setRows] = useState<Array<SaleAttributionRow>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      setPassword(saved);
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (!authed || !password) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const result = await fetchRows({ data: { password, limit: 100 } });
        if (cancelled) return;
        if (!result.ok) {
          setAuthed(false);
          sessionStorage.removeItem(STORAGE_KEY);
          setError("Wrong password.");
          return;
        }
        setRows(result.rows);
        setError(null);
      } catch {
        if (!cancelled) setError("Could not load sales right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const timer = setInterval(load, 15000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [authed, password, fetchRows]);

  const totals = useMemo(() => {
    const live = rows.filter((row) => row.livemode);
    const revenue = live.reduce((sum, row) => sum + row.amountCents, 0);
    const bySource = new Map<string, number>();
    for (const row of live) {
      const key = row.utmSource ?? row.src ?? "direct / unknown";
      bySource.set(key, (bySource.get(key) ?? 0) + 1);
    }
    return {
      count: live.length,
      revenue,
      bySource: [...bySource.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [rows]);

  if (!authed) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 p-6">
        <h1 className="text-xl font-semibold">Sales dashboard</h1>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!password) return;
            sessionStorage.setItem(STORAGE_KEY, password);
            setError(null);
            setAuthed(true);
          }}
        >
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="h-12 rounded-xl border border-border bg-background px-4 text-base"
          />
          <button
            type="submit"
            className="h-12 rounded-xl bg-foreground text-base font-medium text-background"
          >
            Enter
          </button>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">Sales attribution</h1>
        <span className="text-sm text-muted-foreground">
          {loading ? "Refreshing…" : "Auto-refresh every 15s"}
        </span>
      </header>

      {error ? (
        <p className="mb-4 text-sm text-destructive">{error}</p>
      ) : null}

      <section className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Paid sales</p>
          <p className="text-2xl font-semibold">{totals.count}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Revenue</p>
          <p className="text-2xl font-semibold">
            {money(totals.revenue, rows[0]?.currency ?? "gbp")}
          </p>
        </div>
      </section>

      {totals.bySource.length > 0 ? (
        <section className="mb-6 rounded-xl border border-border p-4">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">
            Sales by source
          </h2>
          <ul className="flex flex-wrap gap-2">
            {totals.bySource.map(([source, count]) => (
              <li
                key={source}
                className="rounded-full border border-border px-3 py-1 text-sm"
              >
                {source}: <strong>{count}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3">Paid at (UTC)</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Pack</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Source</th>
              <th className="p-3">Medium</th>
              <th className="p-3">Campaign</th>
              <th className="p-3">Content / Term</th>
              <th className="p-3">Utmify</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={9}>
                  No sales recorded yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="p-3 whitespace-nowrap">{when(row.paidAt)}</td>
                  <td className="p-3">
                    <div>{row.customerName ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.customerEmail ?? ""}
                    </div>
                  </td>
                  <td className="p-3">{row.pack ?? "—"}</td>
                  <td className="p-3 whitespace-nowrap">
                    {money(row.amountCents, row.currency)}
                    {row.livemode ? "" : " (test)"}
                  </td>
                  <td className="p-3">{row.utmSource ?? row.src ?? "—"}</td>
                  <td className="p-3">{row.utmMedium ?? "—"}</td>
                  <td className="p-3">{row.utmCampaign ?? "—"}</td>
                  <td className="p-3">
                    <div>{row.utmContent ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.utmTerm ?? ""}
                    </div>
                  </td>
                  <td className="p-3">{row.utmifyStatus ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
