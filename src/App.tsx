import { useEffect, useMemo, useState } from "react";
import { systemConfig } from "./config/systemConfig";
import { validateAuthMode } from "./auth/modeGuard";
import { demoReferenceConfigs, demoUsers } from "./modules/admin/seedData";
import { registerCorrespondence } from "./modules/intake/registerCorrespondence";

export function App(): JSX.Element {
  const [kpiWindow, setKpiWindow] = useState<"today" | "week" | "month">("week");
  const [refreshedAt, setRefreshedAt] = useState<Date>(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRefreshedAt(new Date());
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const appModeCheck = validateAuthMode(systemConfig.authMode, "APP");
  const intakePreview = registerCorrespondence(
    demoUsers[0],
    {
      branchId: "b-001",
      branchCode: "HQ",
      departmentId: "d-001",
      departmentCode: "OPS",
      subject: "Incoming regulatory letter"
    },
    demoReferenceConfigs,
    systemConfig.orgCode
  );

  const kpis = useMemo(() => {
    const valuesByWindow = {
      today: [
        { label: "Open Actions", value: "29", trend: "+2 today" },
        { label: "Due In 5 Days", value: "6", trend: "1 critical" },
        { label: "Escalated Cases", value: "1", trend: "stable" },
        { label: "Completed Today", value: "15", trend: "On target" }
      ],
      week: [
        { label: "Open Actions", value: "42", trend: "+6% this week" },
        { label: "Due In 5 Days", value: "8", trend: "2 high priority" },
        { label: "Escalated Cases", value: "3", trend: "-1 vs yesterday" },
        { label: "Completed Today", value: "15", trend: "On target" }
      ],
      month: [
        { label: "Open Actions", value: "188", trend: "-4% this month" },
        { label: "Due In 5 Days", value: "23", trend: "5 high priority" },
        { label: "Escalated Cases", value: "12", trend: "Within threshold" },
        { label: "Completed Today", value: "322", trend: "Monthly cumulative" }
      ]
    };

    return valuesByWindow[kpiWindow];
  }, [kpiWindow]);

  return (
    <main className="dashboard-shell">
      <header className="hero">
        <div className="hero__content">
          <p className="eyebrow">Correspondence Operations</p>
          <h1>Enterprise Correspondence Control Center</h1>
          <p className="hero__subtitle">
            Monitor workflows, enforce governance, and keep branch communications moving with
            clear accountability.
          </p>
        </div>
        <div className="hero__status">
          <p className="status__label">System Posture</p>
          <p className="status__line">
            Authentication: <strong>{systemConfig.authMode}</strong>
          </p>
          <p className="status__line">
            Mode Guard: <strong>{appModeCheck.success ? "VALID" : "INVALID"}</strong>
          </p>
          <p className="status__line">
            Refreshed: <strong>{refreshedAt.toLocaleTimeString()}</strong>
          </p>
        </div>
      </header>

      <section className="toolbar" aria-label="dashboard controls">
        <div className="segmented-control">
          <button
            type="button"
            className={kpiWindow === "today" ? "is-active" : ""}
            onClick={() => setKpiWindow("today")}
          >
            Today
          </button>
          <button
            type="button"
            className={kpiWindow === "week" ? "is-active" : ""}
            onClick={() => setKpiWindow("week")}
          >
            This Week
          </button>
          <button
            type="button"
            className={kpiWindow === "month" ? "is-active" : ""}
            onClick={() => setKpiWindow("month")}
          >
            This Month
          </button>
        </div>
      </section>

      <section className="kpi-grid" aria-label="Key metrics">
        {kpis.map((kpi) => (
          <article className="kpi-card" key={kpi.label}>
            <p className="kpi-card__label">{kpi.label}</p>
            <p className="kpi-card__value">{kpi.value}</p>
            <p className="kpi-card__trend">{kpi.trend}</p>
          </article>
        ))}
      </section>

      <section className="panel-grid">
        <article className="panel panel--wide">
          <h2>Phase 1 Delivery Baseline</h2>
          <p>
            Governance and foundational controls are in place, with secure role enforcement and
            mode exclusivity guards.
          </p>
          <ul>
            <li>Explicit user governance and role checks</li>
            <li>APP vs ENTRA authentication mode guardrails</li>
            <li>Configurable reference generation by scope precedence</li>
          </ul>
        </article>

        <article className="panel">
          <h2>Intake Preview</h2>
          <dl className="data-list">
            <div>
              <dt>Subject</dt>
              <dd>{intakePreview.subject}</dd>
            </div>
            <div>
              <dt>Reference</dt>
              <dd>{intakePreview.referenceNumber}</dd>
            </div>
            <div>
              <dt>Recorded By</dt>
              <dd>{intakePreview.createdBy}</dd>
            </div>
          </dl>
        </article>

        <article className="panel">
          <h2>Operational Highlights</h2>
          <ul>
            <li>Branch and department-specific reference patterns available</li>
            <li>Readiness for app-triggered notification flows</li>
            <li>Deadline monitor integration planned in next phase</li>
          </ul>
        </article>

        <article className="panel panel--accent">
          <h2>Next Milestone</h2>
          <p>Phase 2: Dataverse persistence and app-to-flow contracts.</p>
          <button type="button">Open Implementation Board</button>
        </article>
      </section>

      <section className="panel panel--timeline">
        <h2>Execution Roadmap</h2>
        <div className="timeline">
          <div>
            <p className="timeline__title">Current</p>
            <p>Phase 1 complete and validated foundations in code.</p>
          </div>
          <div>
            <p className="timeline__title">Next</p>
            <p>Phase 2 implementation with data persistence and flow triggers.</p>
          </div>
          <div>
            <p className="timeline__title">After</p>
            <p>SLA automation and role-restricted operational dashboards.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
