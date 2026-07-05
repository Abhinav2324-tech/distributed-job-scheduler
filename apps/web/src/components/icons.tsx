import type { SVGProps } from "react";

/**
 * A small hand-drawn icon set, all sharing one stroke weight (1.6) and
 * rounded caps/joins, so the set reads as one family rather than a grab bag
 * from a generic icon library.
 */
function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}

export function OverviewIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M2.5 11.5h3l2-5.5 3 9 2-6.5h4.5" />
    </Icon>
  );
}

export function QueuesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="2.75" y="3.5" width="14.5" height="3.4" rx="1" />
      <rect x="2.75" y="8.3" width="14.5" height="3.4" rx="1" />
      <rect x="2.75" y="13.1" width="9" height="3.4" rx="1" />
    </Icon>
  );
}

export function JobsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="2.75" width="13" height="14.5" rx="2" />
      <path d="M7 7.2h6M7 10.3h6M7 13.4h3.5" />
    </Icon>
  );
}

export function WorkersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="5.5" y="5.5" width="9" height="9" rx="1.5" />
      <path d="M8 2.5v2M12 2.5v2M8 15.5v2M12 15.5v2M2.5 8v2M2.5 12v2M15.5 8v2M15.5 12v2" />
    </Icon>
  );
}

export function DeadLetterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 5.5h9.5a1 1 0 0 1 .77 1.64L11 11l3.27 3.86a1 1 0 0 1-.77 1.64H4" />
      <path d="M4 3.5v13" />
    </Icon>
  );
}

export function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="10" cy="10" r="3.4" />
      <path d="M10 2.75v2M10 15.25v2M17.25 10h-2M4.75 10h-2M15.13 4.87l-1.4 1.4M6.27 13.73l-1.4 1.4M15.13 15.13l-1.4-1.4M6.27 6.27l-1.4-1.4" />
    </Icon>
  );
}

export function MoonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M16.5 11.3A6.8 6.8 0 1 1 8.7 3.5a5.4 5.4 0 0 0 7.8 7.8Z" />
    </Icon>
  );
}
