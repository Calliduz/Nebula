import React from "react";
import { Bug, Coffee, ExternalLink, ShieldAlert, Tv2 } from "lucide-react";

const KOFI_URL = "https://ko-fi.com/calliduz";
const DMCA_EMAIL = "mailto:nebula.database@gmail.com";
const SUPPORT_EMAIL =
  "mailto:nebula.database@gmail.com?subject=Nebula - Bug/Issue Report";
const DISCORD_URL = "https://discord.gg/EYVm7HkMTM";
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

        {/* RIGHT — Support & Community CTA */}
        <div className="flex flex-col gap-4 lg:items-end">
          <p className="text-xs uppercase tracking-[0.18em] text-white/35 font-semibold lg:text-right">
            Support & Community
          </p>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-end w-full sm:w-auto">
            {/* Discord CTA */}
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl
                         bg-[#5865F2]/10 border border-[#5865F2]/20
                         hover:bg-[#5865F2]/18 hover:border-[#5865F2]/45
                         hover:shadow-[0_0_24px_rgba(88,101,242,0.15)]
                         transition-all duration-250 text-[#5865F2] text-sm font-semibold whitespace-nowrap cursor-pointer"
            >
              <svg
                className="w-4 h-4 fill-current group-hover:scale-110 transition-transform duration-200"
                viewBox="0 0 127.14 96.36"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.88-.65,1.72-1.34,2.51-2a75.58,75.58,0,0,0,73,0c.79.71,1.63,1.4,2.51,2a68.32,68.32,0,0,1-10.5,5,77.91,77.91,0,0,0,6.63,10.85,105.73,105.73,0,0,0,32.58-18.83C129.07,48.45,123.07,25.68,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
              </svg>
              Join our Discord
              <ExternalLink
                size={11}
                className="opacity-40 group-hover:opacity-70 transition-opacity"
              />
            </a>

            {/* Ko-fi support button */}
            <a
              href={KOFI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl
                         bg-[#FF5E5B]/10 border border-[#FF5E5B]/20
                         hover:bg-[#FF5E5B]/18 hover:border-[#FF5E5B]/45
                         hover:shadow-[0_0_24px_rgba(255,94,91,0.15)]
                         transition-all duration-250 text-[#FF5E5B] text-sm font-semibold whitespace-nowrap cursor-pointer"
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
          </div>

          <p className="text-white/30 text-xs lg:text-right leading-relaxed max-w-[240px]">
            Your support and presence keep the Nebula project running.
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
