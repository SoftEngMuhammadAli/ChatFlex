import React from "react";
import { MessageSquare, Sparkles } from "lucide-react";

const AuthShell = ({
  eyebrow = "ChatFlex Workspace",
  heroTitle,
  heroDescription,
  heroPoints = [],
  cardTitle,
  cardDescription,
  children,
  footer,
}) => {
  return (
    <div className="theme-auth-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-[1560px] items-stretch px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid w-full gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="theme-auth-showcase hidden rounded-[34px] p-8 text-white lg:flex lg:flex-col lg:justify-between xl:p-12">
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/15 bg-white/12 shadow-lg shadow-black/20 backdrop-blur-sm">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/58">
                    {eyebrow}
                  </p>
                  <p className="mt-1 text-3xl font-bold tracking-tight">
                    ChatFlex
                  </p>
                </div>
              </div>

              <div className="max-w-2xl">
                <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/72">
                  <Sparkles size={12} />
                  Human support, redesigned
                </p>
                <h1 className="max-w-[9ch] text-5xl font-bold leading-[1.02] tracking-[-0.05em] xl:text-6xl">
                  {heroTitle}
                </h1>
                <p className="mt-6 max-w-xl text-base leading-7 text-white/74 xl:text-lg">
                  {heroDescription}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {heroPoints.map((point) => (
                <div
                  key={point}
                  className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-4 backdrop-blur-sm"
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/52">
                    Signal
                  </p>
                  <p className="mt-2 text-sm font-medium leading-6 text-white/84">
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex items-center justify-center">
            <div className="theme-auth-card w-full max-w-[560px] rounded-[34px] px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
              <div className="mb-8 flex items-center gap-3 lg:hidden">
                <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-slate-950 text-white shadow-lg shadow-slate-900/15 dark:bg-white dark:text-slate-950">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    {eyebrow}
                  </p>
                  <p className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                    ChatFlex
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <p className="theme-section-kicker">Secure access</p>
                <h2 className="mt-3 max-w-[10ch] text-4xl font-bold tracking-[-0.05em] text-slate-950 dark:text-white sm:text-[3.4rem] sm:leading-[0.95]">
                  {cardTitle}
                </h2>
                {cardDescription && (
                  <p className="mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                    {cardDescription}
                  </p>
                )}
              </div>

              {children}

              {footer ? <div className="mt-8">{footer}</div> : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
