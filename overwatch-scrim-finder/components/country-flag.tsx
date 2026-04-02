import * as React from "react";
import * as FlagIcons from "country-flag-icons/react/3x2";

type FlagComponent = (props: React.SVGProps<SVGSVGElement>) => React.JSX.Element;

const FLAGS = FlagIcons as Record<string, FlagComponent>;

export default function CountryFlag({
  countryCode,
  className,
  title,
}: {
  countryCode: string;
  className?: string;
  title?: string;
}) {
  const normalizedCode = countryCode.trim().toUpperCase();
  const Flag = FLAGS[normalizedCode];

  if (!Flag) {
    return (
      <span className={className} aria-hidden="true">
        🏳️
      </span>
    );
  }

  return (
    <Flag className={className} aria-label={title || `${normalizedCode} flag`}>
      {title ? <title>{title}</title> : null}
    </Flag>
  );
}