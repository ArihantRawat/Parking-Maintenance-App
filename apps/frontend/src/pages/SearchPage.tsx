import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import type { ApiRecord } from "@parking/shared";
import { globalSearch } from "../api/client";
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

  useEffect(() => {
    setInput(q);
    if (!q) {
      setGroups([]);
      return;
    }
    globalSearch(q).then((result) => setGroups(result.data as SearchGroup[]));
  }, [q]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setParams(input ? { q: input } : {});
  }

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
      <section className="dashboard-heading">
        <div>
          <h1>Global Search</h1>
          <p>Search names, labels, vendors, status, dates, and notes across modules.</p>
        </div>
      </section>
      <form className="search-page-form" onSubmit={submit}>
        <Search size={18} />
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search records" />
        <button className="primary-button" type="submit">
          Search
        </button>
      </form>
      <div className="search-results">
        {groups.map((group) => (
          <section className="search-group" key={group.route}>
            <h2>{group.label}</h2>
            <div className="search-result-list">
              {group.records.map((record) => (
                <Link to={linkFor(group, record)} className="search-result" key={String(record.id)}>
                  <div>
                    <strong>{recordTitle(record)}</strong>
                    <span>{String(record.structure_name ?? "Global")}</span>
                  </div>
                  {record.status ? <StatusBadge value={record.status} /> : null}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
