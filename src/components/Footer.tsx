import React from "react";
import { Bug, Coffee, ExternalLink, ShieldAlert, Tv2 } from "lucide-react";

const KOFI_URL = "https://ko-fi.com/calliduz";
const DMCA_EMAIL = "mailto:nebula.database@gmail.com";
const SUPPORT_EMAIL =
  "mailto:nebula.database@gmail.com?subject=Nebula - Bug/Issue Report";
const CURRENT_YEAR = new Date().getFullYear();

export const Footer: React.FC = () => (
  <footer
    aria-label="Site footer"
    className="relative mt-20 bg-obsidian pb-28 lg:pb-12"
  >
    {/* Top edge */}
    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-nebula-cyan/25 to-transparent" />
    <div className="absolute top-px inset-x-0 h-8 bg-gradient-to-b from-nebula-cyan/[0.03] to-transparent pointer-events-none" />

    <div className="max-w-5xl mx-auto px-6 pt-12 flex flex-col gap-12">
      {/* ── Main content row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 lg:gap-20 items-start">
        {/* LEFT — brand */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl logo-gradient flex items-center justify-center shadow-[0_0_20px_rgba(229,9,20,0.4)]">
              <Tv2 size={16} className="text-white" />
            </div>
            <span className="font-display font-black text-xl tracking-tighter uppercase italic text-white leading-none">
              NEBULA
            </span>
          </div>

          <p className="text-white/50 text-sm leading-relaxed max-w-sm">
            A free streaming index. We don't host media — we catalogue and link
            to publicly available third-party sources.
          </p>

          <div className="flex flex-col gap-2 mt-2">
            <a
              href={DMCA_EMAIL}
              className="inline-flex items-center gap-1.5 text-white/35 hover:text-white/60 transition-colors text-xs w-fit"
            >
              <ShieldAlert size={12} />
              DMCA / Content Removal
            </a>
            <a
              href={SUPPORT_EMAIL}
              className="inline-flex items-center gap-1.5 text-white/35 hover:text-white/60 transition-colors text-xs w-fit"
            >
              <Bug size={12} />
              Report Bugs / Issues
            </a>
          </div>
        </div>

        {/* RIGHT — Ko-fi CTA */}
        <div className="flex flex-col gap-3 lg:items-end">
          <p className="text-xs uppercase tracking-[0.18em] text-white/35 font-semibold lg:text-right">
            Keep us running
          </p>

          <a
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2.5 px-5 py-3 rounded-xl
                       bg-[#FF5E5B]/10 border border-[#FF5E5B]/20
                       hover:bg-[#FF5E5B]/18 hover:border-[#FF5E5B]/45
                       hover:shadow-[0_0_24px_rgba(255,94,91,0.15)]
                       transition-all duration-250 text-[#FF5E5B] text-sm font-semibold whitespace-nowrap"
          >
            <Coffee
              size={16}
              className="group-hover:scale-110 transition-transform duration-200"
            />
            Support on Ko‑fi
            <ExternalLink
              size={11}
              className="opacity-40 group-hover:opacity-70 transition-opacity"
            />
          </a>

          <p className="text-white/30 text-xs lg:text-right leading-relaxed max-w-[210px]">
            Servers cost money. Your support keeps Nebula alive.
          </p>
        </div>
      </div>

      {/* ── Bottom strip ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-5 border-t border-white/[0.06]">
        <p className="text-white/30 text-xs flex items-center gap-2 flex-wrap">
          © {CURRENT_YEAR} Nebula
          <span className="text-white/15">·</span>
          <span className="text-white/25">
            Not affiliated with Netflix, Disney+, or any studio
          </span>
        </p>

        <p className="text-white/25 text-xs leading-relaxed max-w-md sm:text-right">
          We do not store, upload, or distribute copyrighted content. All
          streams are sourced from independent third-party providers.
        </p>
      </div>
    </div>
  </footer>
);
