// Presentation only. No inferred macros, personal recommendations or default targets.
export const macroKeys = ["calories", "protein", "carbs", "fats"];
export function nutritionState(food, targets = null) {
  const documented =
    food?.status === "verified" &&
    typeof food.serving === "string" &&
    food.serving.trim() &&
    typeof food.source === "string" &&
    food.source.trim();
  return Object.fromEntries(
    macroKeys.map((key) => {
      const raw = food?.macros?.[key],
        value =
          documented &&
          typeof raw === "number" &&
          Number.isFinite(raw) &&
          raw >= 0
            ? raw
            : null;
      const target = targets?.[key],
        hasTarget =
          typeof target === "number" && Number.isFinite(target) && target > 0;
      const ratio = value !== null && hasTarget ? (value / target) * 100 : null;
      const percent = ratio !== null && Number.isFinite(ratio) ? ratio : null;
      return [
        key,
        {
          value,
          target: hasTarget ? target : null,
          percent,
          fill: percent === null ? null : Math.min(100, percent),
        },
      ];
    }),
  );
}
