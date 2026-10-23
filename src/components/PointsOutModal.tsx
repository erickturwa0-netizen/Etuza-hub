"use client";

import { Coins, ExternalLink, UserPlus, X } from "lucide-react";
import { POINTS } from "@/lib/points";

type Props = {
  open: boolean;
  points: number;
  inviteCode?: string | null;
  onClose: () => void;
  onWatchAd: () => void;
  onInvite?: () => void;
};

/** 3D-style dialog when points are empty */
export default function PointsOutModal({
  open,
  points,
  inviteCode,
  onClose,
  onWatchAd,
  onInvite,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
      style={{ perspective: "1200px" }}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Funga"
      />

      {/* 3D card */}
      <div
        className="relative w-full max-w-sm"
        style={{
          transformStyle: "preserve-3d",
          animation: "etuza3dIn 0.55s cubic-bezier(0.22,1,0.36,1) both",
        }}
      >
        <div
          className="relative rounded-3xl border border-red-500/40 bg-gradient-to-b from-slate-900 via-slate-950 to-black p-6 shadow-2xl shadow-red-900/40 overflow-hidden"
          style={{
            transform: "rotateX(6deg) rotateY(-4deg)",
            boxShadow:
              "0 25px 50px -12px rgba(220,38,38,0.35), 0 0 0 1px rgba(239,68,68,0.15)",
          }}
        >
          {/* Floating glow orbs */}
          <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-red-600/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 w-36 h-36 rounded-full bg-amber-500/15 blur-3xl" />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-800/80 text-slate-400 hover:text-white touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative flex flex-col items-center text-center gap-3">
            <div
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-red-600 flex items-center justify-center shadow-lg shadow-red-900/50"
              style={{
                transform: "translateZ(40px)",
                animation: "etuzaFloat 2.4s ease-in-out infinite",
              }}
            >
              <Coins className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-xl font-black text-white tracking-tight">
              Point zimeisha!
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Una <span className="text-amber-300 font-bold">{points}</span>{" "}
              point. Ili uendelee kutazama movie, TV, muziki au radio, pata
              point zaidi.
            </p>

            <div className="w-full grid gap-2 mt-1">
              <button
                type="button"
                onClick={onWatchAd}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm touch-manipulation shadow-lg shadow-red-900/40"
              >
                <ExternalLink className="w-4 h-4" />
                Tazama tangazo (+{POINTS.AD_REWARD} point)
              </button>

              {inviteCode && onInvite && (
                <button
                  type="button"
                  onClick={onInvite}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-800 border border-slate-600 text-slate-100 font-semibold text-sm touch-manipulation"
                >
                  <UserPlus className="w-4 h-4" />
                  Alika marafiki (+{POINTS.INVITE_REWARD})
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-500 mt-1">
              Jisajili upya = +{POINTS.SIGNUP} · Invite = +{POINTS.INVITE_REWARD}{" "}
              · Ads = +{POINTS.AD_REWARD}
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes etuza3dIn {
          from {
            opacity: 0;
            transform: rotateX(28deg) translateY(40px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: rotateX(0) translateY(0) scale(1);
          }
        }
        @keyframes etuzaFloat {
          0%,
          100% {
            transform: translateZ(40px) translateY(0);
          }
          50% {
            transform: translateZ(40px) translateY(-8px);
          }
        }
      `}</style>
    </div>
  );
}
