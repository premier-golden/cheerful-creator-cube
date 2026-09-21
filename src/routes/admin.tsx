import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listSaleAttributions,
  type CheckoutInitiationRow,
  type FunnelErrorRow,
  type FunnelStepRow,
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
  const [initiations, setInitiations] = useState<
    Array<CheckoutInitiationRow>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [funnel, setFunnel] = useState<Array<FunnelStepRow>>([]);
  const [funnelErrors, setFunnelErrors] = useState<Array<FunnelErrorRow>>([]);
  const [campaigns, setCampaigns] = useState<Array<string>>([]);
  const [campaign, setCampaign] = useState("");

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
        const result = await fetchRows({
          data: {
            password,
            limit: 100,
            ...(campaign ? { campaign } : {}),
          },
        });
        if (cancelled) return;
        if (!result.ok) {
          setAuthed(false);
          sessionStorage.removeItem(STORAGE_KEY);
          setError("Wrong password.");
          return;
        }
        setRows(result.rows);
        setInitiations(result.initiations);
        setFunnel(result.funnel);
        setFunnelErrors(result.funnelErrors);
        setCampaigns(result.campaigns);
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
  }, [authed, password, campaign, fetchRows]);

  /*
   * Funnel derived metrics. Sessions per step come
   * from the server (distinct checkout_session_id);
   * here we only compute the ratios.
   */
  const funnelView = useMemo(() => {
    const base = funnel[0]?.sessions ?? 0;
    const sessionsOf = (event: string) =>
      funnel.find((step) => step.event === event)?.sessions ?? 0;

    return {
      base,
      payClicked: sessionsOf("pay_clicked"),
      attempts: sessionsOf("confirm_payment_started"),
      paid: sessionsOf("payment_succeeded"),
      steps: funnel.map((step, index) => {
        const previous = index === 0 ? null : (funnel[index - 1]?.sessions ?? 0);
        const stepConversion =
          previous === null
            ? 100
            : previous > 0
              ? (step.sessions / previous) * 100
              : null;
        return {
          event: step.event,
          sessions: step.sessions,
          share: base > 0 ? (step.sessions / base) * 100 : null,
          stepConversion,
          dropOff: stepConversion === null ? null : 100 - stepConversion,
        };
      }),
    };
  }, [funnel]);

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

  /*
   * IC (checkout initiations) and sales grouped
   * by campaign, so each campaign shows how many
   * checkouts it started vs how many sales it closed.
   */
  const byCampaign = useMemo(() => {
    type Entry = { ic: number; sales: number; revenue: number };
    const map = new Map<string, Entry>();

    const keyOf = (source: string | null, campaign: string | null) =>
      `${source ?? "direct / unknown"} · ${campaign ?? "—"}`;

    for (const ic of initiations) {
      const key = keyOf(ic.utmSource ?? ic.src, ic.utmCampaign);
      const entry = map.get(key) ?? { ic: 0, sales: 0, revenue: 0 };
      entry.ic += 1;
      map.set(key, entry);
    }

    for (const row of rows) {
      if (!row.livemode) continue;
      const key = keyOf(row.utmSource ?? row.src, row.utmCampaign);
      const entry = map.get(key) ?? { ic: 0, sales: 0, revenue: 0 };
      entry.sales += 1;
      entry.revenue += row.amountCents;
      map.set(key, entry);
    }

    return [...map.entries()].sort(
      (a, b) => b[1].ic - a[1].ic || b[1].sales - a[1].sales,
    );
  }, [initiations, rows]);

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

      <section className="mb-6 rounded-xl border border-border p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Checkout funnel
          </h2>
          <select
            value={campaign}
            onChange={(event) => setCampaign(event.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
          >
            <option value="">All campaigns</option>
            {campaigns.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground">Checkout sessions</p>
            <p className="text-xl font-semibold">{funnelView.base}</p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground">Pay clicked</p>
            <p className="text-xl font-semibold">{funnelView.payClicked}</p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground">Payment attempts</p>
            <p className="text-xl font-semibold">{funnelView.attempts}</p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground">Paid sales</p>
            <p className="text-xl font-semibold">{funnelView.paid}</p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground">Checkout → Sale</p>
            <p className="text-xl font-semibold">
              {pct(funnelView.paid, funnelView.base)}
            </p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground">Pay → Sale</p>
            <p className="text-xl font-semibold">
              {pct(funnelView.paid, funnelView.payClicked)}
            </p>
          </div>
        </div>

        {funnelView.base === 0 && funnelView.steps.every((s) => s.sessions === 0) ? (
          <p className="text-sm text-muted-foreground">
            No checkout events recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2">Step</th>
                  <th className="p-2">Sessions</th>
                  <th className="p-2">% of checkout</th>
                  <th className="p-2">Step conversion</th>
                  <th className="p-2">Drop-off</th>
                </tr>
              </thead>
              <tbody>
                {funnelView.steps.map((step) => (
                  <tr key={step.event} className="border-t border-border">
                    <td className="p-2">{step.event}</td>
                    <td className="p-2 font-semibold">{step.sessions}</td>
                    <td className="p-2">
                      {step.share === null ? "—" : `${step.share.toFixed(1)}%`}
                    </td>
                    <td className="p-2">
                      {step.stepConversion === null
                        ? "—"
                        : `${step.stepConversion.toFixed(1)}%`}
                    </td>
                    <td className="p-2">
                      {step.dropOff === null
                        ? "—"
                        : `${step.dropOff.toFixed(1)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-6 rounded-xl border border-border p-4">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Checkout errors
        </h2>
        {funnelErrors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No checkout errors recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2">Error</th>
                  <th className="p-2">Sessions</th>
                  <th className="p-2">Occurrences</th>
                </tr>
              </thead>
              <tbody>
                {funnelErrors.map((row) => (
                  <tr key={row.errorCode} className="border-t border-border">
                    <td className="p-2">{row.errorCode}</td>
                    <td className="p-2 font-semibold">{row.sessions}</td>
                    <td className="p-2">{row.occurrences}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>


      <section className="mb-6 rounded-xl border border-border p-4">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          IC and sales by campaign
        </h2>
        {byCampaign.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No checkout initiations recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2">Campaign</th>
                  <th className="p-2">IC</th>
                  <th className="p-2">Sales</th>
                  <th className="p-2">IC → Sale</th>
                  <th className="p-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {byCampaign.map(([campaign, stats]) => (
                  <tr key={campaign} className="border-t border-border">
                    <td className="p-2">{campaign}</td>
                    <td className="p-2 font-semibold">{stats.ic}</td>
                    <td className="p-2 font-semibold">{stats.sales}</td>
                    <td className="p-2">
                      {stats.ic > 0
                        ? `${((stats.sales / stats.ic) * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {money(stats.revenue, rows[0]?.currency ?? "gbp")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
