import source from "./generated/premium-muscle-map.json";
export type BodyView = "f" | "b";
export type MuscleRegion = "arms" | "back" | "legs" | "core" | "chest";
export type MuscleSelection = {
  type: "muscleselect";
  muscle: MuscleRegion | null;
  rank: string | null;
  view: BodyView;
};
export type SvgShape = {
  tag: string;
  attrs: Record<string, string>;
  children: SvgShape[];
};
export type RegionDefinition = {
  id: MuscleRegion;
  name: string;
  side: string;
  view: string | null;
  tierId: string;
  color: string;
  iconPaths: string[];
  paths: Partial<Record<BodyView, string[]>>;
  anchors: Partial<Record<BodyView, { x: number; y: number }>>;
};
export const premiumMap = source as unknown as {
  source: typeof source.source;
  viewBox: number[];
  ranks: typeof source.ranks;
  regions: RegionDefinition[];
  background: SvgShape[];
  tierSemantics: string;
};
export const visibleRegions = (view: BodyView) =>
  premiumMap.regions.filter((r) => r.paths[view]?.length);
export function selectionFor(
  muscle: MuscleRegion | null,
  view: BodyView,
): MuscleSelection {
  if (view !== "f" && view !== "b") throw Error("Unknown body view");
  const region = muscle
    ? visibleRegions(view).find((r) => r.id === muscle)
    : null;
  if (muscle && !region) throw Error("Region is not visible in this view");
  return { type: "muscleselect", muscle, rank: region?.tierId || null, view };
}
export function toggleRegion(
  selected: MuscleRegion | null,
  tapped: MuscleRegion,
  view: BodyView,
) {
  return selectionFor(selected === tapped ? null : tapped, view);
}
