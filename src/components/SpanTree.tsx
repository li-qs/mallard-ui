import { useMemo, useState } from "react";
import { Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Span } from "../types";
import { formatDuration, msToTime, nsToMs } from "../utils/format";
import "./SpanTree.css";

interface SpanNode {
  span: Span;
  children: SpanNode[];
}

function buildTree(spans: Span[]): SpanNode[] {
  const map = new Map<string, SpanNode>();
  spans.forEach((s) => map.set(s.span_id, { span: s, children: [] }));

  const roots: SpanNode[] = [];
  for (const node of map.values()) {
    const { span } = node;
    if (span.is_root || span.parent_id === "" || !map.has(span.parent_id)) {
      roots.push(node);
    } else {
      map.get(span.parent_id)?.children.push(node);
    }
  }

  const sortNodes = (nodes: SpanNode[]) => {
    nodes.sort((a, b) => a.span.start_time - b.span.start_time);
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);
  return roots;
}

export default function SpanTree({
  spans,
  appMap,
}: {
  spans: Span[];
  appMap?: Map<string, string>;
}) {
  const [tip, setTip] = useState<{
    left: number;
    top: number;
    span: Span;
  } | null>(null);

  const tree = useMemo(() => buildTree(spans), [spans]);

  const bounds = useMemo(() => {
    let minStart = Infinity;
    let maxEnd = -Infinity;
    for (const s of spans) {
      if (s.start_time < minStart) minStart = s.start_time;
      if (s.start_time + s.duration > maxEnd)
        maxEnd = s.start_time + s.duration;
    }
    if (minStart === Infinity) minStart = 0;
    if (maxEnd === -Infinity) maxEnd = 0;
    return { minStart, totalDuration: maxEnd - minStart };
  }, [spans]);

  const waterfallStyle = (span: Span) => {
    const { minStart, totalDuration } = bounds;
    const left =
      totalDuration > 0
        ? ((span.start_time - minStart) / totalDuration) * 100
        : 0;
    const width =
      totalDuration > 0 ? (span.duration / totalDuration) * 100 : 100;
    return {
      left: `${Math.max(0, Math.min(100, left))}%`,
      width: `${Math.max(0, Math.min(100, width))}%`,
    };
  };

  const columns: ColumnsType<SpanNode> = [
    {
      title: "操作",
      dataIndex: ["span", "operation"],
      key: "operation",
      render: (_: unknown, node: SpanNode) =>
        node.span.is_root ? (
          <span style={{ fontWeight: 600 }}>{node.span.operation}</span>
        ) : (
          node.span.operation
        ),
    },
    {
      title: "瀑布图",
      key: "waterfall",
      width: 320,
      render: (_, node: SpanNode) => (
        <div
          onMouseEnter={(e) => showTip(e, node.span)}
          onMouseMove={(e) => showTip(e, node.span)}
          onMouseLeave={hideTip}
          style={{
            position: "relative",
            height: 18,
            background: "#f5f5f5",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              height: "100%",
              borderRadius: 3,
              background: node.span.status !== 0 ? "#ff4d4f" : "#1677ff",
              ...waterfallStyle(node.span),
            }}
          />
        </div>
      ),
    },
    {
      title: "耗时",
      key: "duration",
      width: 120,
      render: (_, node: SpanNode) => formatDuration(node.span.duration),
    },
    {
      title: "App",
      key: "appId",
      width: 200,
      render: (_, node: SpanNode) => {
        const name = appMap?.get(node.span.app_id);
        return (
          <Tag>
            <Typography.Text
              copyable={{
                text: node.span.app_id,
                tooltips: ["复制 App ID", "已复制"],
              }}
            >
              {name || node.span.app_id}
            </Typography.Text>
          </Tag>
        );
      },
    },
    {
      title: "状态",
      key: "status",
      width: 90,
      render: (_, node: SpanNode) =>
        node.span.status !== 0 ? (
          <span style={{ color: "#ff4d4f" }}>错误 [{node.span.status}]</span>
        ) : (
          <span style={{ color: "#999" }}>正常</span>
        ),
    },
    {
      title: "错误信息",
      key: "error",
      render: (_, node: SpanNode) =>
        node.span.error && (
          <Tooltip title={node.span.error}>
            <span
              style={{
                color: "#ff4d4f",
                display: "inline-block",
                maxWidth: 320,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                verticalAlign: "bottom",
              }}
            >
              {node.span.error}
            </span>
          </Tooltip>
        ),
    },
  ];

  const showTip = (e: React.MouseEvent, span: Span) => {
    let left = e.clientX + 16;
    if (left + 420 > window.innerWidth) left = e.clientX - 420 - 16;
    setTip({ left, top: e.clientY - 20, span });
  };
  const hideTip = () => setTip(null);

  return (
    <div
      className="st-wrap"
      style={{
        border: "1px solid #f0f0f0",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          background: "#fafafa",
          fontWeight: 600,
          fontSize: 14,
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        瀑布图
      </div>
      <Table<SpanNode>
        size="small"
        rowKey={(node) => node.span.span_id}
        columns={columns}
        dataSource={tree}
        pagination={false}
        expandable={{ defaultExpandAllRows: true }}
        locale={{ emptyText: "暂无数据" }}
        style={{ background: "#fff" }}
      />
      {tip && (
        <div className="st-tip" style={{ left: tip.left, top: tip.top }}>
          <div className="st-tip-title">Span 详情</div>
          <div>
            <span className="st-tip-label">操作</span>
            {tip.span.operation}
          </div>
          <div>
            <span className="st-tip-label">App</span>
            {appMap?.get(tip.span.app_id) || tip.span.app_id}
          </div>
          <div>
            <span className="st-tip-label">Span ID</span>
            {tip.span.span_id}
          </div>
          <div>
            <span className="st-tip-label">Parent ID</span>
            {tip.span.parent_id || "(根)"}
          </div>
          <div>
            <span className="st-tip-label">耗时</span>
            {formatDuration(tip.span.duration)}
          </div>
          <div>
            <span className="st-tip-label">状态</span>
            {tip.span.status !== 0 ? `错误 [${tip.span.status}]` : "正常"}
          </div>
          <div>
            <span className="st-tip-label">开始时间</span>
            {msToTime(nsToMs(tip.span.start_time))}
          </div>
          {tip.span.error && (
            <div className="st-tip-err">
              <span className="st-tip-label">错误</span>
              {tip.span.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
