import { percent } from "@/lib/format";
import type { AttackGroup } from "@/lib/types";
import { attackGroups, groupNames, rateOf } from "./groups";

function Share({ hits, scenarios, index, withPaycurb }: { hits: number | null; scenarios: number; index: number; withPaycurb: boolean }) {
  const rate = rateOf(hits, scenarios);
  if (rate === null) return <span className="share muted">Pending</span>;
  return (
    <span className="share">
      <span className="num">
        {hits} of {scenarios}
        <span className="muted wide-only"> · {percent(rate)}</span>
      </span>
      <span className="share-track" aria-hidden="true">
        {rate > 0 && <span className={`share-fill${withPaycurb ? " with" : ""}`} style={{ width: `${rate * 100}%`, marginLeft: "auto", "--i": index } as React.CSSProperties} />}
      </span>
    </span>
  );
}

export function GroupBars({ groups }: { groups: AttackGroup[] }) {
  const rows = attackGroups(groups);
  return (
    <section className="panel" aria-labelledby="groups-title">
      <header className="panel-head">
        <h2 id="groups-title">By attack group</h2>
        <p className="small muted wide-only">Scenarios where money moved beyond policy</p>
      </header>
      <ul className="groups">
        <li className="group-row head" aria-hidden="true">
          <span>Group</span>
          <span style={{ textAlign: "right" }}>Without Paycurb</span>
          <span style={{ textAlign: "right" }}>With Paycurb</span>
        </li>
        {rows.map((group, index) => (
          <li key={group.group} className="group-row rise" style={{ "--i": index } as React.CSSProperties}>
            <span className="group-name">
              <b>{group.group}</b>
              {groupNames[group.group] ?? "Other"}
            </span>
            <Share hits={group.baseline_success} scenarios={group.scenarios} index={index} withPaycurb={false} />
            <Share hits={group.protected_success} scenarios={group.scenarios} index={index} withPaycurb />
          </li>
        ))}
      </ul>
    </section>
  );
}
