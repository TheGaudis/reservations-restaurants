/**
 * Icons of docs/spec/08 § 6.2, SVG paths copied from v1-final:js and v1-final:index.html. Decorative: `aria-hidden`,
 * colour from `currentColor`; the button or the text next to an icon carries the accessible name. The CSS of the
 * component sets the size (attributes below: legacy defaults).
 */

import type { ReactNode } from "react";

interface IconProps {
  className?: string | undefined;
}

// Material Symbols glyphs: viewBox "0 -960 960 960", filled with currentColor.
function MaterialIcon({ path, className }: IconProps & { path: string }) {
  return (
    <svg
      className={className}
      viewBox="0 -960 960 960"
      width="24"
      height="24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

// Stroke icons of the legacy `ICONS` object (ICON_ATTRS, v1-final:js/interface.js): viewBox 24, stroke 2.
function StrokeIcon({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** `ICONS.print`: « Imprimer la liste », « Imprimer » of the tomorrow panel (07 § 1). */
export function PrintIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M6 9V3h12v6" />
      <rect x="3" y="9" width="18" height="8" rx="2" />
      <path d="M6 14h12v7H6z" />
    </StrokeIcon>
  );
}

/** `ICONS.settings`: summary of the « Paramètres » panel (06 § 2.2). */
export function SettingsIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </StrokeIcon>
  );
}

/** `ICONS.check`: round check of the booking summary (08 § 6.1). */
export function SummaryCheckIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </StrokeIcon>
  );
}

/** `SEG_CHECK`: check of a selected segment (08 § 4.5); also the success glyph of a toast (08 § 4.14). */
export function CheckIcon({ className }: IconProps) {
  return (
    <MaterialIcon
      className={className}
      path="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"
    />
  );
}

/** `--toast-icon` of `.toast.error`: glyph of an error toast (08 § 4.14). */
export function PriorityHighIcon({ className }: IconProps) {
  return (
    <MaterialIcon className={className} path="M440-400v-360h80v360h-80Zm0 200v-80h80v80h-80Z" />
  );
}

/** `EYE_ON`: « Afficher le mot de passe » (06 § 1.1). */
export function VisibilityIcon({ className }: IconProps) {
  return (
    <MaterialIcon
      className={className}
      path="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-80q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z"
    />
  );
}

/** `EYE_OFF`: « Masquer le mot de passe » (06 § 1.1). */
export function VisibilityOffIcon({ className }: IconProps) {
  return (
    <MaterialIcon
      className={className}
      path="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-57 736 736-56 57ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Z"
    />
  );
}

/** `CAL_ICON`: date field of « Ouvrir un jour » (06 § 3.1). */
export function CalendarIcon({ className }: IconProps) {
  return (
    <MaterialIcon
      className={className}
      path="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z"
    />
  );
}

/** `CHEVRON_PREV`: previous period of a calendar or of the date picker (05 § 2.2, 06 § 3). */
export function ChevronPrevIcon({ className }: IconProps) {
  return (
    <MaterialIcon
      className={className}
      path="M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z"
    />
  );
}

/** `CHEVRON_NEXT`: next period of a calendar or of the date picker (05 § 2.2, 06 § 3). */
export function ChevronNextIcon({ className }: IconProps) {
  return (
    <MaterialIcon
      className={className}
      path="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"
    />
  );
}

/** Chevron of the « Paramètres » summary (`expand_more`, 08 § 4.11). */
export function ExpandMoreIcon({ className }: IconProps) {
  return (
    <MaterialIcon
      className={className}
      path="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z"
    />
  );
}

/** Cross of « Retirer le plat » in « Ouvrir un jour » R2 (`close`, 06 § 4.2). */
export function CloseIcon({ className }: IconProps) {
  return (
    <MaterialIcon
      className={className}
      path="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"
    />
  );
}

/** Icon of the loading failure box (`error`, 08 § 4.12, 03 § 3.1). */
export function ErrorIcon({ className }: IconProps) {
  return (
    <MaterialIcon
      className={className}
      path="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"
    />
  );
}

/**
 * « ⚠ » of the configuration banner (PLAN annexe F, `loading.configBanner`): Material Symbols `warning`, outlined,
 * weight 400, as the legacy page has no SVG for it.
 */
export function WarningIcon({ className }: IconProps) {
  return (
    <MaterialIcon
      className={className}
      path="m40-120 440-760 440 760H40Zm138-80h604L480-720 178-200Zm302-40q17 0 28.5-11.5T520-280q0-17-11.5-28.5T480-320q-17 0-28.5 11.5T440-280q0 17 11.5 28.5T480-240Zm-40-120h80v-200h-80v200Zm40-100Z"
    />
  );
}
