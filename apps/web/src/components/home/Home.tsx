import { Bar, Days, Foot, Mark, Numbers, Play, Replay, Watch } from "../concept-a/ConceptA";
import { Motion } from "../concept-a/Motion";
import { Compare, ConnectSection, End, Results, StoryHero, TourSection } from "../concept-b/ConceptB";
import { toFacts } from "../concept-b/facts";
import { loadReport } from "../landing/data";
import { Focus } from "./Focus";
import "./home.css";

export function Home() {
  const report = loadReport();
  const facts = toFacts(report);
  return (
    <div className="cb ca home" id="top">
      <a className="cb-skip" href="#main">
        Skip to content
      </a>
      <Motion />
      <Focus />
      <Bar />
      <main id="main">
        <StoryHero />
        <Play />
        <Days />
        {report && <Numbers report={report} />}
        <TourSection latency={facts?.latency ?? null} mark={<Mark />} />
        {facts && <Results facts={facts} mark={<Mark />} />}
        <Compare mark={<Mark />} />
        <ConnectSection mark={<Mark />} />
        <Watch report={report} />
        <Replay />
        <End mark={<Mark />} />
      </main>
      <Foot />
    </div>
  );
}
