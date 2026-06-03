import React from "react";
import { Heart, Coffee, ShieldAlert, ExternalLink, Tv2 } from "lucide-react";

// ── Nebula Footer ──────────────────────────────────────────────────────────────
// Shown on every non-player page below the main content.
// Design tokens: obsidian bg, nebula-cyan accents.
// ──────────────────────────────────────────────────────────────────────────────

const KOFI_URL = "https://ko-fi.com/calliduz"; // ← replace with your Ko-fi handle
const DMCA_EMAIL = "mailto:nebula.database@gmail.com"; // ← replace with your DMCA contact

const CURRENT_YEAR = new Date().getFullYear();

interface FooterLinkProps {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}

const FooterLink: React.FC<FooterLinkProps> = ({
  href,
  children,
  external = false,
}) => (
  <a
    href={href}
    target={external ? "_blank" : undefined}
    rel={external ? "noopener noreferrer" : undefined}
    className="text-white/40 hover:text-nebula-cyan transition-colors duration-200 text-xs flex items-center gap-1 group"
  >
    {children}
    {external && (
      <ExternalLink
        size={10}
        className="opacity-0 group-hover:opacity-60 transition-opacity"
      />
    )}
  </a>
);

export const Footer: React.FC = () => (
  <footer
    aria-label="Site footer"
    className="relative mt-16 border-t border-white/[0.06] bg-obsidian pb-28 lg:pb-10"
  >
    {/* Subtle top glow bar */}
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-nebula-cyan/30 to-transparent pointer-events-none" />

    <div className="max-w-6xl mx-auto px-5 pt-10 flex flex-col gap-10">
      {/* ── Brand row ── */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-16">
        {/* Logo + tagline */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg logo-gradient flex items-center justify-center shadow-[0_0_14px_rgba(229,9,20,0.35)]">
              <Tv2 size={16} className="text-white" />
            </div>
            <span className="font-display font-black text-lg tracking-tighter uppercase italic text-white">
              NEBULA
            </span>
          </div>
          <p className="text-white/35 text-xs leading-relaxed max-w-xs">
            A free, ad-supported streaming index. We don&apos;t host any media —
            we simply catalogue and link to publicly available third-party
            sources.
          </p>
        </div>

        {/* Links grid */}
        <div className="flex flex-wrap gap-x-10 gap-y-6">
          {/* Support */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-semibold mb-1">
              Support the project
            </span>
            <a
              href={KOFI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg
                         bg-[#FF5E5B]/10 border border-[#FF5E5B]/25
                         text-[#FF5E5B] hover:bg-[#FF5E5B]/20 hover:border-[#FF5E5B]/50
                         transition-all duration-200 text-xs font-semibold group"
            >
              <Coffee size={13} className="group-hover:animate-bounce" />
              Buy me a coffee on Ko‑fi
              <ExternalLink size={10} className="opacity-50" />
            </a>
            <p className="text-white/25 text-[10px] mt-0.5 leading-relaxed max-w-[180px]">
              Running servers isn&apos;t free. Every coffee keeps the lights on.
              ☕
            </p>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-semibold mb-1">
              Legal
            </span>
            <FooterLink href="/privacy">Privacy Policy</FooterLink>
            <FooterLink href="/terms">Terms of Service</FooterLink>
            <FooterLink href={DMCA_EMAIL} external>
              <ShieldAlert size={11} />
              DMCA / Takedown
            </FooterLink>
          </div>

          {/* Info */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-semibold mb-1">
              Info
            </span>
            <FooterLink href="/faq">FAQ</FooterLink>
            <FooterLink href="/sources">Sources</FooterLink>
            <FooterLink href="https://github.com" external>
              GitHub
            </FooterLink>
          </div>
        </div>
      </div>

      {/* ── Disclaimer ── */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5 flex items-start gap-3">
        <ShieldAlert
          size={14}
          className="text-nebula-cyan/50 mt-0.5 shrink-0"
        />
        <p className="text-white/25 text-[10px] leading-relaxed">
          <span className="text-white/40 font-semibold">Disclaimer:</span>{" "}
          Nebula does not store, upload, or distribute any copyrighted content.
          All streams are sourced from independent third-party providers. We
          have no affiliation with any streaming service. If you believe content
          infringes your copyright, please{" "}
          <a
            href={DMCA_EMAIL}
            className="text-nebula-cyan/60 hover:text-nebula-cyan underline underline-offset-2 transition-colors"
          >
            contact us
          </a>{" "}
          and we will remove it promptly.
        </p>
      </div>

      {/* ── Bottom bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/[0.05]">
        <p className="text-white/20 text-[10px]">© {CURRENT_YEAR} Nebula.</p>
        <p className="text-white/15 text-[10px]">
          Not affiliated with Netflix, Disney+, or any major studio.
        </p>
      </div>
    </div>
  </footer>
);
