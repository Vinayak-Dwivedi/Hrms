import Image from "next/image";
import { ILEADS_LOGO_ALT, ILEADS_LOGO_SRC } from "@/lib/branding";

type Props = {
  className?: string;
  width?: number;
  priority?: boolean;
};

export function AppLogo({
  className = "max-w-[130px] h-auto",
  width = 130,
  priority = false,
}: Props) {
  return (
    <Image
      alt={ILEADS_LOGO_ALT}
      className={className}
      height={Math.round(width * 0.25)}
      priority={priority}
      src={ILEADS_LOGO_SRC}
      width={width}
    />
  );
}
