import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { ChevronDown, ChevronRight, Layers, Maximize2, Minus, Plus, SlidersHorizontal } from "lucide-react";
import { fetchRelationshipGraph } from "../api/client";
import { StatusBadge } from "./StatusBadge";
import { humanize } from "../utils/format";
import { detailEntries, formatDetailValue, groupColor, relationshipLinkCounts, type GraphEdge, type GraphNode } from "./relationship/relationshipUtils";

type RelationshipViewProps = {
  structureId: number;
};

export function RelationshipView({ structureId }: RelationshipViewProps) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [zoom, setZoom] = useState(1);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRelationshipGraph(structureId, { status, from, to }).then((result) => {
      setNodes(result.data.nodes as GraphNode[]);
      setEdges(result.data.edges as GraphEdge[]);
      setSelected(null);
    });
  }, [from, status, structureId, to]);

  const rootNode = useMemo(() => nodes.find((node) => node.group === "structures") ?? null, [nodes]);
  const allGroups = useMemo(() => Array.from(new Set(nodes.map((node) => node.group))).filter((group) => group !== "structures"), [nodes]);
  const visibleGroups = useMemo(
    () => (selectedTypes.size === 0 ? allGroups : allGroups.filter((group) => selectedTypes.has(group))),
    [allGroups, selectedTypes]
  );
  const statusOptions = useMemo(() => Array.from(new Set(nodes.map((node) => String(node.status ?? "")).filter(Boolean))).sort(), [nodes]);

  const linkCountByNode = useMemo(() => relationshipLinkCounts(edges, rootNode?.id), [edges, rootNode?.id]);

  const groupedNodes = useMemo(
    () =>
      visibleGroups.map((group) => ({
        group,
        nodes: nodes.filter((node) => node.group === group)
      })),
    [visibleGroups, nodes]
  );

  const totalVisible = useMemo(() => groupedNodes.reduce((sum, group) => sum + group.nodes.length, 0), [groupedNodes]);

  function toggleGroup(group: string) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }

  function zoomWithWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }
    event.preventDefault();
    const direction = event.deltaY > 0 ? -0.08 : 0.08;
    setZoom((current) => Math.min(1.4, Math.max(0.6, Number((current + direction).toFixed(2)))));
  }

  function setAllGroups(collapsed: boolean) {
    setCollapsedGroups(collapsed ? new Set(visibleGroups) : new Set());
  }

  function toggleType(group: string) {
    setSelectedTypes((current) => {
      const next = new Set(current);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }

  return (
    <section className="relationship-panel">
      <div className="section-header">
        <div>
          <h2>Structure Map</h2>
          <p>The structure and everything linked to it, grouped so it stays readable.</p>
        </div>
        <div className="tree-toolbar">
          <button className="icon-button" type="button" onClick={() => setZoom((current) => Math.max(0.6, Number((current - 0.1).toFixed(1))))} aria-label="Zoom out" title="Zoom out">
            <Minus size={15} />
          </button>
          <span className="zoom-label">{Math.round(zoom * 100)}%</span>
          <button className="icon-button" type="button" onClick={() => setZoom((current) => Math.min(1.4, Number((current + 0.1).toFixed(1))))} aria-label="Zoom in" title="Zoom in">
            <Plus size={15} />
          </button>
          <button className="icon-button" type="button" onClick={() => setZoom(1)} aria-label="Reset zoom" title="Reset zoom">
            <Maximize2 size={15} />
          </button>
        </div>
      </div>

      <div className="inline-filter-row">
        <SlidersHorizontal size={16} />
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter map by status">
          <option value="">All statuses</option>
          {statusOptions.map((item) => (
            <option key={item} value={item}>
              {humanize(item)}
            </option>
          ))}
        </select>
        <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="From date" />
        <input type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="To date" />
        <button className="text-button" type="button" onClick={() => setAllGroups(false)}>
          Expand all
        </button>
        <button className="text-button" type="button" onClick={() => setAllGroups(true)}>
          Collapse all
        </button>
        <span className="map-help">Hold Ctrl and scroll to zoom.</span>
      </div>

      <div className="tree-type-filter" aria-label="Filter by record types">
        <button className={selectedTypes.size === 0 ? "active" : ""} type="button" onClick={() => setSelectedTypes(new Set())}>
          <Layers size={13} />
          All types
        </button>
        {allGroups.map((group) => (
          <button key={group} className={selectedTypes.has(group) ? "active" : ""} type="button" onClick={() => toggleType(group)}>
            <span style={{ backgroundColor: groupColor(group) }} />
            {humanize(group)}
            <small>{nodes.filter((node) => node.group === group).length}</small>
          </button>
        ))}
      </div>

      <div className="relationship-layout">
        <div className="relationship-tree-viewport" onWheel={zoomWithWheel}>
          <div className="relationship-tree" style={{ "--tree-zoom": zoom } as CSSProperties}>
            {rootNode ? (
              <button
                className={`tree-root-card ${selected?.id === rootNode.id ? "tree-node-selected" : ""}`}
                type="button"
                onClick={() => setSelected(rootNode)}
              >
                <span>Parking Structure</span>
                <strong>{rootNode.label}</strong>
                <div className="tree-root-meta">
                  {rootNode.status ? <StatusBadge value={rootNode.status} /> : null}
                  <small>
                    {totalVisible} linked {totalVisible === 1 ? "record" : "records"}
                  </small>
                </div>
              </button>
            ) : null}

            <div className="tree-branches">
              {groupedNodes.length === 0 ? <div className="tree-empty-row">No linked records match the current filters.</div> : null}
              {groupedNodes.map((group) => {
                const isCollapsed = collapsedGroups.has(group.group);
                return (
                  <section className="tree-group" key={group.group} style={{ borderTopColor: groupColor(group.group) }}>
                    <button className="tree-group-header" type="button" onClick={() => toggleGroup(group.group)}>
                      {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                      <span style={{ backgroundColor: groupColor(group.group) }} />
                      <strong>{humanize(group.group)}</strong>
                      <small>{group.nodes.length}</small>
                    </button>
                    {!isCollapsed ? (
                      <div className="tree-node-list">
                        {group.nodes.length > 0 ? (
                          group.nodes.map((node) => {
                            const links = linkCountByNode.get(node.id) ?? 0;
                            return (
                              <button
                                key={node.id}
                                type="button"
                                className={`tree-node-card ${selected?.id === node.id ? "tree-node-selected" : ""}`}
                                style={{ borderLeftColor: groupColor(node.group) }}
                                onClick={() => setSelected(node)}
                              >
                                <strong>{node.label}</strong>
                                <div className="tree-node-meta">
                                  {node.status ? <StatusBadge value={node.status} /> : null}
                                  {links > 0 ? (
                                    <span className="tree-link-count">
                                      {links} {links === 1 ? "link" : "links"}
                                    </span>
                                  ) : null}
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="tree-empty-row">No records in this group.</div>
                        )}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          </div>
        </div>
        <aside className="relationship-detail">
          {selected ? (
            <>
              <p>{humanize(selected.group)}</p>
              <h3>{selected.label}</h3>
              {selected.status ? <StatusBadge value={selected.status} /> : null}
              <dl>
                {detailEntries(selected.data).map(([key, value]) => (
                  <div key={key}>
                    <dt>{humanize(key)}</dt>
                    <dd>{formatDetailValue(key, value)}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <div className="relationship-detail-empty">
              <Layers size={22} />
              <p>Select any card to see its full details here.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
