import styles from "@/ui/feedback/Skeleton.module.css";

export interface SkeletonProps {
  /** `line` 14 px, `title` 32 px, `circle` 40 px, `cell` square of a calendar grid, `card` 120 px (08 § 4.16). */
  shape?: "line" | "title" | "circle" | "cell" | "card" | undefined;
  /** Width of a line or a title, as a share of its container (« 40% »); full width otherwise. */
  width?: `${number}%` | undefined;
  /** Load failure: the shimmer stops (08 § 4.16). */
  still?: boolean | undefined;
}

/**
 * Grey shape that stands for content still loading (08 § 4.16). Hidden from assistive technologies: the container
 * says that the page is loading (`aria-busy`), never a « Chargement » text (03 § 3).
 */
export function Skeleton({ shape = "line", width, still = false }: SkeletonProps) {
  return (
    <span
      className={styles["skeleton"]}
      data-shape={shape}
      data-still={still || undefined}
      style={width === undefined ? undefined : { width }}
      aria-hidden="true"
    />
  );
}
