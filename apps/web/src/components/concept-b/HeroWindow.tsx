import { CheckIcon, ClockIcon, GateMark, StopIcon } from "../icons";
import type { Decision } from "../landing/chain";
import { auditRows, history, lampDecision, paypalReference, story, type FeedRow } from "./heroData";
import { storyCss } from "./story";

const words: Record<Decision, string> = { allow: "Allowed", escalate: "Held", block: "Blocked" };
const icons: Record<Decision, typeof CheckIcon> = { allow: CheckIcon, escalate: ClockIcon, block: StopIcon };

function Pill({ decision, className = "" }: { decision: Decision; className?: string }) {
  const Icon = icons[decision];
  return (
    <span className={`cb-pill cb-pill-${decision} ${className}`}>
      <Icon size={13} />
      {words[decision]}
    </span>
  );
}

function Route({ decision }: { decision: Decision }) {
  return (
    <span className={`cb-route cb-route-${decision}`}>
      <i />
      <b />
      <i />
      <b />
      <i />
    </span>
  );
}

function Row({ row, name, children }: { row: FeedRow; name?: string; children?: React.ReactNode }) {
  return (
    <li className={`cb-row${name ? ` cb-row-${name}` : ""}`}>
      {children ?? (
        <>
          <Pill decision={row.decision} />
          <span className="cb-row-main">
            <b>{row.what}</b>
            <span>
              {row.merchant}, {row.reason.charAt(0).toLowerCase() + row.reason.slice(1)}
            </span>
          </span>
          <Route decision={row.decision} />
          <span className="cb-row-amt">
            <b className="cb-fig">{row.amount}</b>
            <span>
              Rule <code>{row.rule}</code>
            </span>
          </span>
        </>
      )}
      {row.decision === "block" && name && <span className={`cb-stamp cb-stamp-${name}`}>{`Blocked ${row.rule}`}</span>}
    </li>
  );
}

function LampRow() {
  const row = story.lamp;
  return (
    <Row row={row} name="lamp">
      <span className="cb-swap">
        <Pill decision="escalate" className="cb-lamp-held" />
        <Pill decision="allow" className="cb-lamp-paid" />
      </span>
      <span className="cb-row-main">
        <b>{row.what}</b>
        <span className="cb-swap">
          <span className="cb-lamp-held">
            {row.merchant}, {row.reason.charAt(0).toLowerCase() + row.reason.slice(1)}
          </span>
          <span className="cb-lamp-paid">{row.merchant}, you approved it from your phone</span>
        </span>
      </span>
      <span className="cb-swap">
        <span className="cb-lamp-held">
          <Route decision="escalate" />
        </span>
        <span className="cb-lamp-paid">
          <Route decision="allow" />
        </span>
      </span>
      <span className="cb-row-amt">
        <b className="cb-fig">{row.amount}</b>
        <span className="cb-swap">
          <span className="cb-lamp-held">
            Rule <code>{row.rule}</code>
          </span>
          <span className="cb-lamp-paid cb-lamp-ref">
            <code>{paypalReference}</code>
          </span>
        </span>
      </span>
    </Row>
  );
}

function Phone({ inline = false }: { inline?: boolean }) {
  return (
    <div className={`cb-phone-wrap${inline ? " cb-phone-inline" : ""}`}>
        <div className="cb-phone" data-ui>
          <div className="cb-phone-top">
            <span className="cb-fig">9:41</span>
            <span className="cb-notch" />
          </div>
          <p className="cb-phone-app">
            <GateMark size={14} />
            Paycurb asks you
          </p>
          <div className="cb-ask">
            <p className="cb-ask-amt cb-fig">{story.lamp.amount}</p>
            <p className="cb-ask-what">Desk lamp at {story.lamp.merchant}</p>
            <p className="cb-ask-why">
              Held by {lampDecision.rule_id}. {story.lamp.reason}.
            </p>
            <p className="cb-ask-bind">Your yes is bound to this exact order. A changed total is refused.</p>
          </div>
          <div className="cb-ask-actions">
            <span className="cb-reject">Reject</span>
            <span className="cb-approve">
              Approve
              <span className="cb-tap" />
            </span>
          </div>
          <div className="cb-approved">
            <CheckIcon size={18} />
            Approved. Paycurb is paying PayPal now.
          </div>
        </div>
      </div>
  );
}

const linkTop = (index: number) => 19 + index * 38;

export function HeroWindow() {
  const first = auditRows[0];
  return (
    <div className="cb-stage" aria-hidden="true" data-ui>
      <style href="cb-story" precedence="default">
        {storyCss}
      </style>
      <div className="cb-win">
        <div className="cb-chrome">
          <span className="cb-url">paycurb, live feed</span>
        </div>
        <div className="cb-app-top">
          <span className="cb-brand">
            <GateMark size={18} />
            Paycurb
          </span>
          <span className="cb-nav">
            <span className="cb-nav-on">Feed</span>
            <span>
              Approvals
              <span className="cb-count cb-fig">
                <span className="cb-count-a">2</span>
                <span className="cb-count-b">3</span>
              </span>
            </span>
            <span className="cb-hide-s">Audit</span>
            <span className="cb-hide-s">Attacks</span>
          </span>
          <span className="cb-live">
            <i />
            Live
          </span>
        </div>
        <div className="cb-body">
          <div className="cb-gate">
            <span className="cb-track">
              <span className="cb-line" />
              <span className="cb-node cb-node-agent">
                <span className="cb-dot" />
                <b>Agent</b>
                <span>No PayPal keys</span>
              </span>
              <span className="cb-node cb-node-pay">
                <span className="cb-policy">
                  <GateMark size={20} posts />
                  <span className="cb-ring cb-ring-watch" />
                  <span className="cb-ring cb-ring-lamp" />
                  <span className="cb-ring cb-ring-resent" />
                </span>
                <b>Paycurb policy</b>
                <span className="cb-caps">
                  <span className="cb-cap cb-cap-idle">Checks every call before PayPal</span>
                  <span className="cb-cap cb-cap-watch cb-tone-r">
                    Blocked by {story.watch.rule}: {story.watch.reason.charAt(0).toLowerCase() + story.watch.reason.slice(1)}
                  </span>
                  <span className="cb-cap cb-cap-lamp cb-tone-a">Held for you by {story.lamp.rule}</span>
                  <span className="cb-cap cb-cap-resent cb-tone-r">
                    Blocked by {story.resent.rule}: {story.resent.reason.charAt(0).toLowerCase() + story.resent.reason.slice(1)}
                  </span>
                  <span className="cb-cap cb-cap-wait cb-tone-a">Waiting for you: desk lamp, {story.lamp.amount}</span>
                  <span className="cb-cap cb-cap-paid cb-tone-g">Approved and sent to PayPal</span>
                </span>
              </span>
              <span className="cb-node cb-node-pp">
                <span className="cb-dot cb-dot-end">
                  <span className="cb-ring cb-ring-paypal" />
                </span>
                <b>PayPal</b>
                <span>Sandbox</span>
              </span>
              <span className="cb-lane">
                {(["watch", "lamp", "resent"] as const).map((name) => (
                  <span key={name} className={`cb-mover cb-puck-${name}`}>
                    <span className="cb-puck">
                      <span className="cb-tone cb-tone-block" />
                      <span className="cb-tone cb-tone-held" />
                      <span className="cb-tone cb-tone-allow" />
                    </span>
                  </span>
                ))}
              </span>
            </span>
          </div>
          <div className="cb-grid">
            <section className="cb-panel cb-feed">
              <header className="cb-panel-head">
                <b>What your agent tried</b>
                <span>Newest first</span>
              </header>
              <div className="cb-feed-view">
                <ol className="cb-feed-list">
                  <Row row={story.resent} name="resent" />
                  <LampRow />
                  <Row row={story.watch} name="watch" />
                  {history.map((row) => (
                    <Row key={row.key} row={row} />
                  ))}
                </ol>
              </div>
            </section>
            <Phone inline />
            <section className="cb-panel cb-chain">
              <header className="cb-panel-head">
                <b>Audit chain</b>
                <span className="cb-verified">
                  <CheckIcon size={12} />
                  Verified
                </span>
              </header>
              <ol className="cb-links">
                <li className="cb-link cb-link-5">
                  <span className="cb-fig">{first.seq - 1}</span>
                  <span className="cb-link-what">Earlier entries</span>
                  <code>{first.prev}</code>
                  <code className="cb-prev">...</code>
                </li>
                {auditRows.map((row) => (
                  <li key={row.seq} className={`cb-link cb-link-${row.seq}`}>
                    <span className="cb-fig">{row.seq}</span>
                    <span className="cb-link-what">
                      <i className={`cb-mark cb-mark-${row.decision}`} />
                      {row.what}
                    </span>
                    <code>{row.entry}</code>
                    <code className="cb-prev">{row.prev}</code>
                  </li>
                ))}
              </ol>
              <svg className="cb-wires" width="180" height={38 * 7} viewBox={`0 0 180 ${38 * 7}`} fill="none">
                {auditRows.map((row, index) => {
                  const from = linkTop(index + 1);
                  const to = linkTop(index);
                  return <path key={row.seq} className={`cb-wire cb-wire-${row.seq}${row.seq === 11 ? " cb-wire-last" : ""}`} pathLength={1} d={`M130 ${from - 9} C130 ${from - 26} 46 ${to + 26} 46 ${to + 9}`} />;
                })}
              </svg>
            </section>
          </div>
        </div>
        <span className="cb-cursor">
          <svg className="cb-cursor-tip" width="22" height="26" viewBox="0 0 22 26" fill="none">
            <path d="M2 2v19l5.2-4.6 3.5 7.6 3.6-1.6-3.4-7.4H18L2 2Z" fill="#111" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      <Phone />
    </div>
  );
}
