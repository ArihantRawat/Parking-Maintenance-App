import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import type { ApiRecord } from "@parking/shared";
import { globalSearch } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { recordTitle } from "../utils/format";

type SearchGroup = {
  moduleKey: string;
  route: string;
  label: string;
  records: ApiRecord[];
};

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const [input, setInput] = useState(q);
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInput(q);
    if (!q) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    globalSearch(q)
      .then((result) => setGroups(result.data as SearchGroup[]))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [q]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setParams(input ? { q: input } : {});
  }

  const totalResults = groups.reduce((sum, group) => sum + group.records.length, 0);

  function linkFor(group: SearchGroup, record: ApiRecord) {
    if (group.route === "structures") {
      return `/structures/${record.id}`;
    }
    if (record.structure_id) {
      return `/structures/${record.structure_id}/${group.route}`;
    }
    return "/";
  }

  return (
    <div className="page-stack">
      <section className="dashboard-heading search-hero">
        <div className="search-hero-copy">
          <span className="search-hero-kicker">
            <Sparkles size={14} />
            Global Search
          </span>
          <h1>Search</h1>
          <p>Find records across structures, parking spaces, signs, equipment, orders, cleaning, barricading, reminders, and vendors</p>
        </div>
        <div className="search-hero-stats">
          <div>
            <strong>{groups.length}</strong>
            <span>modules</span>
          </div>
          <div>
            <strong>{totalResults}</strong>
            <span>results</span>
          </div>
        </div>
      </section>
      <section className="search-panel">
        <form className="search-page-form search-page-form-large" onSubmit={submit}>
          <div className="search-input-wrap">
            <Search size={18} />
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search by name, location, type, status, vendor, or notes" />
          </div>
          <div className="search-form-actions">
            {input ? (
              <button className="text-button" type="button" onClick={() => setParams({})}>
                Clear
              </button>
            ) : null}
            <button className="primary-button" type="submit">
              Search
            </button>
          </div>
        </form>
        <div className="search-helper-row">
          <span>Try a structure name, sign type, equipment status, vendor contact, or note text</span>
          {q ? <strong>{loading ? "Searching..." : `${totalResults} results for "${q}"`}</strong> : <strong>Enter a keyword to search all modules at once</strong>}
        </div>
      </section>
      <div className="search-results">
        {!q && !loading ? <EmptyState title="Enter a keyword above to search all modules" /> : null}
        {q && !loading && totalResults === 0 ? <EmptyState title={`No results found for "${q}"`} /> : null}
        {loading ? <div className="table-loading">Searching records...</div> : null}
        {groups.map((group) => (
          <section className="search-group" key={group.route}>
            <div className="search-group-header">
              <div>
                <h2>{group.label}</h2>
                <p>{group.records.length} matching records</p>
              </div>
            </div>
            <div className="search-result-list">
              {group.records.map((record) => (
                <Link to={linkFor(group, record)} className="search-result" key={String(record.id)}>
                  <div className="search-result-copy">
                    <strong>{recordTitle(record)}</strong>
                    <span>{String(record.structure_name ?? "Not tied to a structure")}</span>
                  </div>
                  <div className="search-result-meta">
                    {record.status ? <StatusBadge value={record.status} /> : null}
                    <ArrowRight size={16} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
