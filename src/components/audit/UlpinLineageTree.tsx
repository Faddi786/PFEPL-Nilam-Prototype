import { useMemo, useState } from "react";
import type { ParcelRecord } from "../../data/mockData";
import {
  generateUlpinLineageTree,
  type UlpinLineageNode,
  type UlpinLineageTreeData,
} from "../../data/parcelWorkspaceMock";
import UlpinAttributeModal from "./UlpinAttributeModal";

type Props = {
  parcel: ParcelRecord;
};

const NODE_RADIUS = 36;
const H_GAP = 56;
const V_GAP = 80;
const LABEL_HEIGHT = 28;
const LAYOUT_PADDING_TOP = 16;
const LAYOUT_PADDING_X = 48;
const LAYOUT_PADDING_BOTTOM = 48;

type Point = { x: number; y: number };

type StyledEdge = {
  from: string;
  to: string;
  dashed: boolean;
  onPath: boolean;
};

type TreeLayout = {
  positions: Map<string, Point>;
  nodes: Map<string, UlpinLineageNode>;
  edges: StyledEdge[];
  viewBox: { x: number; y: number; width: number; height: number };
};

function collectNodes(tree: UlpinLineageTreeData) {
  const map = new Map<string, UlpinLineageNode>();
  tree.levels.forEach((level) => level.nodes.forEach((node) => map.set(node.id, node)));
  return map;
}

function collectEdges(tree: UlpinLineageTreeData) {
  const edges: Array<{ from: string; to: string }> = [];
  Object.entries(tree.binaryChildren).forEach(([from, children]) => {
    if (children.left) edges.push({ from, to: children.left });
    if (children.right) edges.push({ from, to: children.right });
  });
  return edges;
}

function layoutBinaryTree(tree: UlpinLineageTreeData): TreeLayout {
  const nodes = collectNodes(tree);
  const rawEdges = collectEdges(tree);
  const pathSet = new Set(tree.lineagePathIds);

  const unitPositions = new Map<string, { x: number; depth: number }>();

  function placeSubtree(id: string, depth: number, xStart: number): number {
    const children = tree.binaryChildren[id];
    const leftId = children?.left;
    const rightId = children?.right;

    if (!leftId && !rightId) {
      unitPositions.set(id, { x: xStart + 0.5, depth });
      return 1;
    }

    let cursor = xStart;
    let leftCenter = xStart + 0.5;
    let rightCenter = xStart + 0.5;

    if (leftId) {
      placeSubtree(leftId, depth + 1, cursor);
      leftCenter = unitPositions.get(leftId)!.x;
      cursor += subtreeWidth(leftId);
    }

    if (rightId) {
      placeSubtree(rightId, depth + 1, cursor);
      rightCenter = unitPositions.get(rightId)!.x;
    }

    const centerX =
      leftId && rightId ? (leftCenter + rightCenter) / 2 : leftId ? leftCenter : rightCenter;
    unitPositions.set(id, { x: centerX, depth });
    return subtreeWidth(id);
  }

  function subtreeWidth(id: string): number {
    const children = tree.binaryChildren[id];
    const leftId = children?.left;
    const rightId = children?.right;
    if (!leftId && !rightId) return 1;
    let width = 0;
    if (leftId) width += subtreeWidth(leftId);
    if (rightId) width += subtreeWidth(rightId);
    return width;
  }

  placeSubtree(tree.rootId, 0, 0);

  let minUnit = Infinity;
  let maxUnit = -Infinity;
  unitPositions.forEach(({ x }) => {
    minUnit = Math.min(minUnit, x);
    maxUnit = Math.max(maxUnit, x);
  });

  const unitWidth = 2 * NODE_RADIUS + H_GAP;
  const rowHeight = 2 * NODE_RADIUS + LABEL_HEIGHT + V_GAP;
  const spanUnits = Math.max(maxUnit - minUnit, 1);

  const treeWidth = spanUnits * unitWidth;
  const maxDepth = Math.max(...[...unitPositions.values()].map((p) => p.depth), 0);
  const treeHeight = maxDepth * rowHeight + 2 * NODE_RADIUS + LABEL_HEIGHT;

  const offsetX = LAYOUT_PADDING_X + (treeWidth - spanUnits * unitWidth) / 2;
  const offsetY = LAYOUT_PADDING_TOP + NODE_RADIUS;

  const positions = new Map<string, Point>();
  unitPositions.forEach(({ x, depth }, id) => {
    positions.set(id, {
      x: offsetX + (x - minUnit) * unitWidth,
      y: offsetY + depth * rowHeight,
    });
  });

  const styledEdges: StyledEdge[] = rawEdges.map((edge) => ({
    ...edge,
    dashed: false,
    onPath: pathSet.has(edge.from) && pathSet.has(edge.to),
  }));

  const viewBox = {
    x: 0,
    y: 0,
    width: treeWidth + LAYOUT_PADDING_X * 2,
    height: treeHeight + LAYOUT_PADDING_TOP + LAYOUT_PADDING_BOTTOM,
  };

  return { positions, nodes, edges: styledEdges, viewBox };
}

function connectorPath(from: Point, to: Point) {
  const fromY = from.y + NODE_RADIUS;
  const toY = to.y - NODE_RADIUS;
  const midY = (fromY + toY) / 2;
  return `M ${from.x} ${fromY} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${toY}`;
}

function SvgTreeNode({
  node,
  x,
  y,
  onSelect,
}: {
  node: UlpinLineageNode;
  x: number;
  y: number;
  onSelect: (node: UlpinLineageNode) => void;
}) {
  const onPath = node.onLineagePath ?? false;
  const displayUlpin = node.ulpin.slice(-4);

  const fill = onPath ? "#ecfdf5" : "#ffffff";
  const stroke = onPath ? "#10b981" : "#cbd5e1";

  return (
    <g
      className="cursor-pointer outline-none"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(node)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(node);
        }
      }}
    >
      <circle
        cx={x}
        cy={y}
        r={NODE_RADIUS}
        fill={fill}
        stroke={stroke}
        strokeWidth={2}
        className="transition-shadow hover:drop-shadow-md focus-visible:outline-none"
      />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        className="pointer-events-none select-none font-mono text-[13px] font-semibold"
        fill={onPath ? "#064e3b" : "#1e293b"}
      >
        {displayUlpin}
      </text>
    </g>
  );
}

export default function UlpinLineageTree({ parcel }: Props) {
  const tree = useMemo(() => generateUlpinLineageTree(parcel), [parcel]);
  const layout = useMemo(() => layoutBinaryTree(tree), [tree]);
  const [selectedNode, setSelectedNode] = useState<UlpinLineageNode | null>(null);

  const { viewBox } = layout;

  return (
    <div>
      <div className="w-full overflow-visible rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 sm:p-6">
        <svg
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          width={viewBox.width}
          height={viewBox.height}
          preserveAspectRatio="xMidYMid meet"
          className="mx-auto block"
          aria-label="ULPIN lineage tree"
        >
          {layout.edges.map((edge) => {
            const from = layout.positions.get(edge.from);
            const to = layout.positions.get(edge.to);
            if (!from || !to) return null;

            const stroke = edge.onPath ? "#10b981" : "#94a3b8";
            const strokeWidth = edge.onPath ? 2.25 : 1.5;

            return (
              <path
                key={`${edge.from}-${edge.to}`}
                d={connectorPath(from, to)}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
            );
          })}

          {[...layout.positions.entries()].map(([id, pos]) => {
            const node = layout.nodes.get(id);
            if (!node) return null;

            return (
              <SvgTreeNode
                key={id}
                node={node}
                x={pos.x}
                y={pos.y}
                onSelect={setSelectedNode}
              />
            );
          })}
        </svg>
      </div>

      {selectedNode ? (
        <UlpinAttributeModal
          node={selectedNode}
          parcel={parcel}
          onClose={() => setSelectedNode(null)}
        />
      ) : null}
    </div>
  );
}
