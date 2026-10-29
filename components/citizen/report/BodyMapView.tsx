"use client";

import { useId } from "react";
import { cn } from "cn";
import type { BodyRegion } from "./body-regions";
import { getRegionsForView } from "./body-regions";

interface BodyMapViewProps {
  view: "front" | "back";
  selectedRegions: string[];
  onRegionSelect: (regionId: string) => void;
  onRegionRemove: (regionId: string) => void;
  maxSelections?: number;
  disabled?: boolean;
  preview?: boolean;
  showCallouts?: boolean;
}

function BodyMapView({
  view,
  selectedRegions,
  onRegionSelect,
  onRegionRemove,
  maxSelections = 3,
  disabled = false,
  preview = false,
  showCallouts = true,
}: BodyMapViewProps) {
  const instance = useId();
  const previewRegion = selectedRegions[0] ?? "";
  const previewBox =
    previewRegion.includes("foot") || previewRegion.includes("knee")
      ? "70 380 160 205"
      : previewRegion.includes("hip") || previewRegion.includes("leg")
        ? "70 275 160 240"
        : previewRegion.includes("hand")
          ? "10 175 280 175"
          : "20 10 260 315";
  const regions = getRegionsForView(view);
  const isAtMax = selectedRegions.length >= maxSelections;

  const handleRegionClick = (region: BodyRegion) => {
    if (disabled) return;

    const isSelected = selectedRegions.includes(region.id);

    if (isSelected) {
      onRegionRemove(region.id);
    } else if (!isAtMax) {
      onRegionSelect(region.id);
    }
  };

  const handleKeyDown = (
    region: BodyRegion,
    event: React.KeyboardEvent<SVGPathElement>,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleRegionClick(region);
    }
  };

  return (
    <div
      className={cn("bm-view", `bm-view--${view}`)}
      aria-label={`${view} body view`}
    >
      <svg
        className="bm-svg"
        viewBox={
          preview
            ? previewBox
            : !showCallouts
              ? "0 0 300 600"
              : view === "front"
                ? "-100 0 410 600"
                : "-10 0 410 600"
        }
        preserveAspectRatio="xMidYMid meet"
        role={preview ? "img" : "group"}
        aria-label={`Interactive ${view} body map`}
      >
        <defs>
          <filter
            id={`bm-body-shadow-${instance}`}
            x="-30%"
            y="-20%"
            width="160%"
            height="150%"
          >
            <feDropShadow
              dx="0"
              dy="6"
              stdDeviation="8"
              floodColor="#08214a"
              floodOpacity="0.08"
            />
          </filter>
        </defs>

        {/* Ground shadow */}
        <ellipse
          cx="150"
          cy="574"
          rx="72"
          ry="9"
          className="bm-ground-shadow"
        />

        {/* 
          Smooth visual silhouette behind the interactive regions.
          This replaces the previous rectangle/block silhouette.
        */}
        <g
          className="bm-body-group"
          filter={`url(#bm-body-shadow-${instance})`}
          aria-hidden="true"
        >
          {/* Head */}
          <path
            className="bm-body-silhouette"
            d="
              M150 22
              C130 22 119 38 120 61
              C121 82 132 96 150 96
              C168 96 179 82 180 61
              C181 38 170 22 150 22
              Z
            "
          />

          {/* Neck */}
          <path
            className="bm-body-silhouette"
            d="
              M137 88
              C140 101 138 109 130 117
              C136 127 164 127 170 117
              C162 109 160 101 163 88
              Z
            "
          />

          {/* Torso */}
          <path
            className="bm-body-silhouette"
            d="
              M129 112
              C111 114 91 120 78 131
              C68 140 64 153 67 168
              C72 192 84 210 91 229
              C99 250 99 275 104 296

              C111 315 128 324 150 324

              C172 324 189 315 196 296
              C201 275 201 250 209 229
              C216 210 228 192 233 168
              C236 153 232 140 222 131
              C209 120 189 114 171 112

              C165 124 159 129 150 129
              C141 129 135 124 129 112
              Z
            "
          />

          {/* Left arm */}
          <path
            className="bm-body-silhouette"
            d="
              M79 132
              C64 138 56 151 52 169
              L42 236
              C40 249 43 263 49 276
              C53 284 63 285 69 278
              C73 272 75 263 77 254
              L89 202
              L98 157
              C97 145 90 136 79 132
              Z
            "
          />

          {/* Right arm */}
          <path
            className="bm-body-silhouette"
            d="
              M221 132
              C236 138 244 151 248 169
              L258 236
              C260 249 257 263 251 276
              C247 284 237 285 231 278
              C227 272 225 263 223 254
              L211 202
              L202 157
              C203 145 210 136 221 132
              Z
            "
          />

          {/* Left hand */}
          <path
            className="bm-body-silhouette"
            d="
              M49 270
              C41 276 36 287 33 299
              L29 316
              C28 322 32 325 36 320
              L41 307

              L39 326
              C39 332 44 333 47 326
              L50 309

              L49 330
              C50 336 55 336 57 329
              L59 309

              L61 326
              C62 332 67 331 68 325

              L70 299
              C70 286 65 276 59 271
              Z
            "
          />

          {/* Right hand */}
          <path
            className="bm-body-silhouette"
            d="
              M251 270
              C259 276 264 287 267 299
              L271 316
              C272 322 268 325 264 320
              L259 307

              L261 326
              C261 332 256 333 253 326
              L250 309

              L251 330
              C250 336 245 336 243 329
              L241 309

              L239 326
              C238 332 233 331 232 325

              L230 299
              C230 286 235 276 241 271
              Z
            "
          />

          {/* Left thigh */}
          <path
            className="bm-body-silhouette"
            d="
              M106 292
              C114 309 128 319 147 321
              L143 392
              C141 415 137 438 134 460
              L104 460
              C100 436 96 413 93 389
              C89 352 92 315 106 292
              Z
            "
          />

          {/* Right thigh */}
          <path
            className="bm-body-silhouette"
            d="
              M194 292
              C186 309 172 319 153 321
              L157 392
              C159 415 163 438 166 460
              L196 460
              C200 436 204 413 207 389
              C211 352 208 315 194 292
              Z
            "
          />

          {/* Left lower leg */}
          <path
            className="bm-body-silhouette"
            d="
              M104 448
              C111 443 126 443 134 449
              L131 535
              C130 545 125 550 117 550
              C108 550 103 545 102 536
              L97 477
              C96 465 98 455 104 448
              Z
            "
          />

          {/* Right lower leg */}
          <path
            className="bm-body-silhouette"
            d="
              M196 448
              C189 443 174 443 166 449
              L169 535
              C170 545 175 550 183 550
              C192 550 197 545 198 536
              L203 477
              C204 465 202 455 196 448
              Z
            "
          />

          {/* Left foot */}
          <path
            className="bm-body-silhouette"
            d="
              M102 527
              C107 536 124 539 131 532
              L132 553
              C128 564 115 569 96 566
              C85 564 82 558 88 551
              Z
            "
          />

          {/* Right foot */}
          <path
            className="bm-body-silhouette"
            d="
              M198 527
              C193 536 176 539 169 532
              L168 553
              C172 564 185 569 204 566
              C215 564 218 558 212 551
              Z
            "
          />
        </g>

        {/* Existing semantic interactive regions */}
        {regions.map((region) => {
          const isSelected = selectedRegions.includes(region.id);
          const canSelect = !isSelected && !isAtMax && !disabled;

          return (
            <path
              key={`${view}-${region.id}`}
              className={cn(
                "bm-region",
                isSelected && "bm-region--selected",
                canSelect && "bm-region--selectable",
                !canSelect && !isSelected && "bm-region--disabled",
              )}
              d={region.path}
              transform={
                region.mirrored ? "translate(300 0) scale(-1 1)" : undefined
              }
              onClick={preview ? undefined : () => handleRegionClick(region)}
              onKeyDown={
                preview ? undefined : (event) => handleKeyDown(region, event)
              }
              tabIndex={
                !preview && !disabled && (isSelected || canSelect) ? 0 : -1
              }
              role={preview ? undefined : "button"}
              aria-pressed={preview ? undefined : isSelected}
              aria-label={`${region.label}${isSelected ? " (selected)" : ""}`}
              aria-disabled={disabled || (!canSelect && !isSelected)}
            >
              <title>{region.label}</title>
            </path>
          );
        })}
        {!preview && showCallouts && (
          <g className="bm-callouts" aria-hidden="true">
            {(view === "front"
              ? [
                  ["Head", 120, 58],
                  ["Neck", 135, 106],
                  ["Chest", 114, 164],
                  ["Abdomen", 109, 244],
                  ["Shoulder", 74, 143],
                  ["Arm", 49, 229],
                  ["Hand", 40, 305],
                  ["Hip", 99, 326],
                  ["Leg", 101, 386],
                  ["Knee", 103, 457],
                  ["Foot", 96, 555],
                ]
              : [
                  ["Head", 179, 58],
                  ["Neck", 163, 106],
                  ["Upper Back", 185, 187],
                  ["Lower Back", 187, 264],
                  ["Shoulder", 226, 143],
                  ["Arm", 252, 229],
                  ["Hand", 260, 305],
                  ["Hip", 201, 326],
                  ["Leg", 199, 386],
                  ["Knee", 197, 457],
                  ["Foot", 204, 555],
                ]
            ).map(([label, x, y]) => (
              <g key={label}>
                <line x1={x} y1={y} x2={view === "front" ? -18 : 318} y2={y} />
                <circle cx={x} cy={y} r="2.5" />
                <text
                  x={view === "front" ? -24 : 324}
                  y={Number(y) + 4}
                  textAnchor={view === "front" ? "end" : "start"}
                >
                  {label}
                </text>
              </g>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}

export { BodyMapView };
export type { BodyMapViewProps };
