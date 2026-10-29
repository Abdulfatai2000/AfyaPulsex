/** Body region definitions for interactive body map.
 *  Regions match the approved AfyaPulse body map design.
 *  Each region has: id, label, view (front/back), and SVG path.
 */

export type BodyRegionId =
  | "head"
  | "neck"
  | "chest"
  | "upper-abdomen"
  | "lower-abdomen"
  | "upper-back"
  | "lower-back"
  | "left-shoulder"
  | "right-shoulder"
  | "left-arm"
  | "right-arm"
  | "left-hand"
  | "right-hand"
  | "left-hip"
  | "right-hip"
  | "left-leg"
  | "right-leg"
  | "left-knee"
  | "right-knee"
  | "left-foot"
  | "right-foot";

export interface BodyRegion {
  id: BodyRegionId;
  label: string;
  view: "front" | "back";
  path: string;
  mirrored?: boolean;
}

// Coordinates share BodyMapView's 300 x 600 silhouette. Side-specific paths
// are mirrored by orientation so left always means the person's left.
const central: BodyRegion[] = [
  {
    id: "head",
    label: "Head",
    view: "front",
    path: "M150 22 C130 22 119 38 120 61 C121 82 132 96 150 96 C168 96 179 82 180 61 C181 38 170 22 150 22 Z",
  },
  {
    id: "neck",
    label: "Neck",
    view: "front",
    path: "M137 96 Q142 109 130 117 Q150 139 170 117 Q158 109 163 96 Z",
  },
  {
    id: "chest",
    label: "Chest",
    view: "front",
    path: "M114 121 Q150 143 186 121 L203 167 L193 199 Q150 215 107 199 L97 167 Z",
  },
  {
    id: "upper-abdomen",
    label: "Upper Abdomen",
    view: "front",
    path: "M107 201 Q150 217 193 201 L198 250 Q150 268 102 250 Z",
  },
  {
    id: "lower-abdomen",
    label: "Lower Abdomen",
    view: "front",
    path: "M102 252 Q150 270 198 252 L194 290 Q150 339 106 290 Z",
  },
  {
    id: "upper-back",
    label: "Upper Back",
    view: "back",
    path: "M114 121 Q150 136 186 121 L203 167 L196 226 Q150 247 104 226 L97 167 Z",
  },
  {
    id: "lower-back",
    label: "Lower Back",
    view: "back",
    path: "M104 228 Q150 249 196 228 L194 290 Q150 322 106 290 Z",
  },
];
// Viewer-left paths. The anatomical side is chosen when creating each view.
const limbs = [
  {
    part: "shoulder",
    label: "Shoulder",
    path: "M79 132 Q91 121 112 120 L97 167 Q79 185 66 168 Q62 147 79 132 Z",
  },
  {
    part: "arm",
    label: "Upper Arm",
    path: "M65 170 Q78 183 93 173 L77 254 Q72 289 54 280 Q39 263 42 236 L52 180 Z",
  },
  {
    part: "hand",
    label: "Hand",
    path: "M49 280 Q40 283 33 299 L29 316 Q28 325 36 320 L41 307 L39 326 Q39 335 47 326 L50 309 L49 330 Q52 340 57 329 L59 309 L61 326 Q66 337 68 325 L70 299 Q70 285 59 280 Z",
  },
  {
    part: "hip",
    label: "Hip",
    path: "M106 293 Q120 311 146 321 L143 347 Q118 359 94 341 Q95 311 106 293 Z",
  },
  {
    part: "leg",
    label: "Thigh",
    path: "M94 343 Q118 363 143 349 L141 402 L136 440 Q119 431 101 440 L93 389 Q90 363 94 343 Z",
  },
  {
    part: "knee",
    label: "Knee",
    path: "M105 441 Q120 433 132 444 Q139 458 130 478 Q118 488 105 477 Q97 459 105 441 Z",
  },
  {
    part: "foot",
    label: "Foot",
    path: "M102 527 Q113 542 131 532 L132 553 Q123 573 96 566 Q78 563 88 551 Z",
  },
] as const;

export const BODY_REGIONS: BodyRegion[] = (["front", "back"] as const).flatMap(
  (view) => [
    ...central
      .filter(
        (region) =>
          region.view === view ||
          (view === "back" && ["head", "neck"].includes(region.id)),
      )
      .map((region) => ({ ...region, view })),
    ...limbs.flatMap(({ part, label, path }) =>
      (["left", "right"] as const).map((side) => ({
        id: `${side}-${part}` as BodyRegionId,
        label: `${side === "left" ? "Left" : "Right"} ${label}`,
        view,
        path,
        mirrored: view === "front" ? side === "left" : side === "right",
      })),
    ),
  ],
);

export const BODY_REGIONS_BY_VIEW = {
  front: BODY_REGIONS.filter((r) => r.view === "front"),
  back: BODY_REGIONS.filter((r) => r.view === "back"),
} as const;

export function getRegionById(
  id: BodyRegionId,
  view: "front" | "back",
): BodyRegion | undefined {
  return BODY_REGIONS.find((r) => r.id === id && r.view === view);
}

export function getRegionsForView(view: "front" | "back"): BodyRegion[] {
  return BODY_REGIONS_BY_VIEW[view];
}
