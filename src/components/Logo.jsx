import { Clapperboard } from "lucide-react";

export function Logo({ compact = false }) {
  return (
    <div className="flex select-none items-center gap-2.5">
      <div className="relative grid h-9 w-9 place-items-center rounded-full border border-[#d9b77b]/55 bg-[#d9b77b]/10 text-[#d9b77b]">
        <Clapperboard size={17} strokeWidth={1.5} />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#d9b77b] shadow-[0_0_12px_#d9b77b]" />
      </div>

      {!compact && (
        <span className="font-brand text-[17px] font-extrabold tracking-[.19em]">
          CINE<span className="text-[#d9b77b]">VERSE</span>
        </span>
      )}
    </div>
  );
}
