import type { MindNodeLike } from '@/mind/core/nodeContent';
import type { WorldRect } from './geom/rect';

export const NODE_MARKER_GROUPS = [
  { key: 'level', label: '优先级' },
  { key: 'task', label: '任务' },
  { key: 'flag', label: '旗帜' },
  { key: 'star', label: '星星' },
  { key: 'user', label: '人像' },
  { key: 'other', label: '符号' },
] as const;

export type NodeMarkerGroupKey = (typeof NODE_MARKER_GROUPS)[number]['key'];
export type NodeMarkerItem = {
  key: string;
  groupKey: NodeMarkerGroupKey;
  groupLabel: string;
  name: string;
  src: string;
};

export const NODE_MARKER_ICON_SIZE_PX = 18;
export const NODE_MARKER_GAP_PX = 4;
export const NODE_MARKER_BODY_GAP_PX = 8;
const NODE_MARKER_CHAR_COLLATOR = { numeric: true, sensitivity: 'base' } satisfies Intl.CollatorOptions;

const markerIconModules = import.meta.glob('../../core/marker-icon/*/*.svg', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

function sortMarkerEntries([pathA]: [string, string], [pathB]: [string, string]) {
  const nameA = pathA.split('/').pop()?.replace('.svg', '') ?? pathA;
  const nameB = pathB.split('/').pop()?.replace('.svg', '') ?? pathB;
  return nameA.localeCompare(nameB, undefined, NODE_MARKER_CHAR_COLLATOR);
}

export const nodeMarkerGroups = NODE_MARKER_GROUPS.map((group) => {
  const items = Object.entries(markerIconModules)
    .filter(([path]) => path.includes(`/marker-icon/${group.key}/`))
    .sort(sortMarkerEntries)
    .map(([path, src]) => {
      const name = path.split('/').pop()?.replace('.svg', '') ?? path;
      return {
        key: `${group.key}:${name}`,
        groupKey: group.key,
        groupLabel: group.label,
        name,
        src,
      } satisfies NodeMarkerItem;
    });

  return {
    ...group,
    items,
  };
});

const nodeMarkerMap = new Map<string, NodeMarkerItem>(
  nodeMarkerGroups.flatMap((group) => group.items.map((item) => [item.key, item] as const))
);

export function getNodeMarkerItem(markerKey: string | null | undefined) {
  if (!markerKey) return null;
  return nodeMarkerMap.get(markerKey) ?? null;
}

export function getNodeMarkerKeys(node: MindNodeLike | null | undefined) {
  const keys = Array.isArray((node as any)?.markers) ? (node as any).markers : [];
  return keys.filter((key): key is string => typeof key === 'string' && !!getNodeMarkerItem(key));
}

export function setNodeMarkerKeys(node: MindNodeLike | null | undefined, markerKeys: string[]) {
  if (!node) return;
  const normalized = markerKeys.filter((key, index, array) => array.indexOf(key) === index && !!getNodeMarkerItem(key));
  (node as any).markers = normalized;
}

export function resolveNodeMarkers(node: MindNodeLike | null | undefined) {
  return getNodeMarkerKeys(node)
    .map((key) => getNodeMarkerItem(key))
    .filter((item): item is NodeMarkerItem => !!item)
    .sort((a, b) => {
      const groupIndexA = NODE_MARKER_GROUPS.findIndex((group) => group.key === a.groupKey);
      const groupIndexB = NODE_MARKER_GROUPS.findIndex((group) => group.key === b.groupKey);
      if (groupIndexA !== groupIndexB) return groupIndexA - groupIndexB;
      return a.name.localeCompare(b.name, undefined, NODE_MARKER_CHAR_COLLATOR);
    });
}

export function upsertNodeMarker(node: MindNodeLike | null | undefined, markerKey: string) {
  const marker = getNodeMarkerItem(markerKey);
  if (!node || !marker) return;
  const nextKeys = getNodeMarkerKeys(node).filter((key) => getNodeMarkerItem(key)?.groupKey !== marker.groupKey);
  nextKeys.push(marker.key);
  setNodeMarkerKeys(node, nextKeys);
}

export function removeNodeMarker(node: MindNodeLike | null | undefined, markerKey: string) {
  if (!node) return;
  setNodeMarkerKeys(
    node,
    getNodeMarkerKeys(node).filter((key) => key !== markerKey)
  );
}

export function clearNodeMarkers(node: MindNodeLike | null | undefined) {
  if (!node) return;
  setNodeMarkerKeys(node, []);
}

export function measureNodeMarkerRow(node: MindNodeLike | null | undefined) {
  const markers = resolveNodeMarkers(node);
  if (!markers.length) {
    return {
      markers,
      width: 0,
      height: 0,
      bandHeight: 0,
    };
  }

  const width =
    markers.length * NODE_MARKER_ICON_SIZE_PX + Math.max(0, markers.length - 1) * NODE_MARKER_GAP_PX;
  const height = NODE_MARKER_ICON_SIZE_PX;
  return {
    markers,
    width,
    height,
    bandHeight: height + NODE_MARKER_BODY_GAP_PX,
  };
}

export function getNodeBodyWorldRect(node: MindNodeLike | null | undefined, rect: WorldRect): WorldRect {
  const markerBandHeight = measureNodeMarkerRow(node).bandHeight;
  if (markerBandHeight <= 0) return rect;
  return {
    x1: rect.x1,
    y1: rect.y1,
    x2: rect.x2,
    y2: Math.max(rect.y1, rect.y2 - markerBandHeight),
  };
}
