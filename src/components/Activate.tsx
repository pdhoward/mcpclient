'use client'

import { useEffect, useRef, useState } from 'react'
import Loading from '@/components/Loading'
import type { Agent } from '@/lib/types'

/* -------------------------------------------------- */
/* helpers                                            */
/* -------------------------------------------------- */

const rnd = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min)

/* -------------------------------------------------- */
/* props                                              */
/* -------------------------------------------------- */

interface ActivateButtonProps {
  /** full agent list from `useAgentManager()` */
  agents: Agent[]
  /** 1-liner setter coming from `useAgentManager()` */
  setActiveAgent: (agent: Agent) => void
  /** flag ChatPage uses to show `<MetaAgent />` */
  setIsAgentSelected: (v: boolean) => void
  /** optional ui-state flags */
  disabled?: boolean
  loading?: boolean
}

/* -------------------------------------------------- */
/* component                                          */
/* -------------------------------------------------- */

export default function ActivateButton ({
  agents,
  setActiveAgent,
  setIsAgentSelected,
  disabled,
  loading,
}: ActivateButtonProps) {
  const particlePenRef = useRef<HTMLDivElement>(null)
  const [showAgents, setShowAgents] = useState(false)

  /* one-time particle randomisation */
  useEffect(() => {
    particlePenRef.current?.querySelectorAll('.particle').forEach(p => {
      p.setAttribute(
        'style',
        `
        --x:${rnd(20, 80)};
        --y:${rnd(20, 80)};
        --duration:${rnd(6, 20)};
        --delay:${rnd(1, 10)};
        --alpha:${rnd(40, 90) / 100};
        --origin-x:${Math.random() > 0.5 ? rnd(300, 800) * -1 : rnd(300, 800)}%;
        --origin-y:${Math.random() > 0.5 ? rnd(300, 800) * -1 : rnd(300, 800)}%;
        --size:${rnd(40, 90) / 100};
      `
      )
    })
  }, [])

  /* ---- click-handler for button ---------------------------------------------------- */
  const handleButtonClick = () => {
    if (disabled || loading) return
    setShowAgents(true)
  }

  /* ---- select agent handler ---------------------------------------------------- */
  const handleSelectAgent = (agent: Agent) => {
    setActiveAgent(agent)
    setIsAgentSelected(true)
    setShowAgents(false)
  }

  /* ---- ui --------------------------------------------------------------- */
  return (
    <>
      <div className="relative isolate">
        <button
          onClick={handleButtonClick}
          disabled={disabled || loading}
          className={`relative flex items-center justify-center gap-1 px-5 py-3 text-2xl font-medium text-transparent rounded-full transition-all duration-250
            ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer bg-[hsl(260,97%,12%)] hover:bg-[radial-gradient(40%_50%_at_center_100%,hsl(270,97%,72%),transparent),radial-gradient(80%_100%_at_center_120%,hsl(260,97%,70%),transparent),hsl(260,97%,56%)] focus-visible:bg-[radial-gradient(40%_50%_at_center_100%,hsl(270,97%,72%),transparent),radial-gradient(80%_100%_at_center_120%,hsl(260,97%,70%),transparent),hsl(260,97%,56%)] shadow-[0_0_0_0_hsl(260,97%,61%/0),0_0.05em_0_0_hsl(260,97%,62%)_inset,0_-0.05em_0_0_hsl(260,97%,72%)_inset] hover:shadow-[0_0_6em_3em_hsl(260,97%,61%/0.75),0_0.05em_0_0_hsl(260,97%,62%)_inset,0_-0.05em_0_0_hsl(260,97%,72%)_inset] focus-visible:shadow-[0_0_6em_3em_hsl(260,97%,61%/0.75),0_0.05em_0_0_hsl(260,97%,62%)_inset,0_-0.05em_0_0_hsl(260,97%,72%)_inset] scale-100 hover:scale-110 focus-visible:scale-110 active:scale-100 before:content-[""] before:absolute before:inset-[-0.25em] before:z-[-1] before:border-4 before:border-[hsl(260,97%,50%/0.5)] before:rounded-full before:opacity-0 hover:before:opacity-100 focus-visible:before:opacity-100 before:transition-opacity'}
            `}
        >
          <span className="spark absolute inset-0 rounded-full overflow-hidden [mask:linear-gradient(white,transparent_50%)] animate-flip">
            <span className="absolute w-[200%] aspect-square top-0 left-1/2 -translate-x-1/2 -translate-y-[15%] -rotate-90 opacity-60 bg-[conic-gradient(from_0deg,transparent_0_340deg,hsl(0,0%,100%)_360deg)] animate-rotate transition-opacity duration-250 hover:opacity-100 focus-visible:opacity-100" />
          </span>
          <span className="backdrop absolute inset-[0.1em] rounded-full bg-[hsl(260,97%,12%)] transition-colors duration-250 hover:bg-[radial-gradient(40%_50%_at_center_100%,hsl(270,97%,72%),transparent),radial-gradient(80%_100%_at_center_120%,hsl(260,97%,70%),transparent),hsl(260,97%,56%)] focus-visible:bg-[radial-gradient(40%_50%_at_center_100%,hsl(270,97%,72%),transparent),radial-gradient(80%_100%_at_center_120%,hsl(260,97%,70%),transparent),hsl(260,97%,56%)]" />
          {loading ? (
            <Loading className="scale-50 h-6 w-12" />
          ) : (
            <>
              <svg
                className="sparkle w-5 -translate-x-1/4 -translate-y-[5%]"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  className="text-[hsl(0,0%,40%)] hover:animate-bounce hover:[animation-delay:0.15s] focus-visible:animate-bounce focus-visible:[animation-delay:0.15s] transition-colors duration-250"
                  d="M14.187 8.096L15 5.25L15.813 8.096C16.0231 8.83114 16.4171 9.50062 16.9577 10.0413C17.4984 10.5819 18.1679 10.9759 18.903 11.186L21.75 12L18.904 12.813C18.1689 13.0231 17.4994 13.4171 16.9587 13.9577C16.4181 14.4984 16.0241 15.1679 15.814 15.903L15 18.75L14.187 15.904C13.9769 15.1689 13.5829 14.4994 13.0423 13.9587C12.5016 13.4181 11.8321 13.0241 11.097 12.814L8.25 12L11.096 11.187C11.8311 10.9769 12.5006 10.5829 13.0413 10.0423C13.5819 9.50162 13.9759 8.83214 14.186 8.097L14.187 8.096Z"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  className="text-[hsl(0,0%,20%)] hover:animate-bounce hover:[animation-delay:0.2s] focus-visible:animate-bounce focus-visible:[animation-delay:0.2s] transition-colors duration-250"
                  d="M6 14.25L5.741 15.285C5.59267 15.8785 5.28579 16.4206 4.85319 16.8532C4.42059 17.2858 3.87853 17.5927 3.285 17.741L2.25 18L3.285 18.259C3.87853 18.4073 4.42059 18.7142 4.85319 19.1468C5.28579 19.5794 5.59267 20.1215 5.741 20.715L6 21.75L6.259 20.715C6.40725 20.1216 6.71398 19.5796 7.14639 19.147C7.5788 18.7144 8.12065 18.4075 8.714 18.259L9.75 18L8.714 17.741C8.12065 17.5925 7.5788 17.2856 7.14639 16.853C6.71398 16.4204 6.40725 15.8784 6.259 15.285L6 14.25Z"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  className="text-[hsl(0,0%,30%)] hover:animate-bounce hover:[animation-delay:0.35s] focus-visible:animate-bounce focus-visible:[animation-delay:0.35s] transition-colors duration-250"
                  d="M6.5 4L6.303 4.5915C6.24777 4.75718 6.15472 4.90774 6.03123 5.03123C5.90774 5.15472 5.75718 5.24777 5.5915 5.303L5 5.5L5.5915 5.697C5.75718 5.75223 5.90774 5.84528 6.03123 5.96877C6.15472 6.09226 6.24777 6.24282 6.303 6.4085L6.5 7L6.697 6.4085C6.75223 6.24282 6.84528 6.09226 6.96877 5.96877C7.09226 5.84528 7.24282 5.75223 7.4085 5.697L8 5.5L7.4085 5.303C7.24282 5.24777 7.09226 5.15472 6.96877 5.03123C6.84528 4.90774 6.75223 4.75718 6.697 4.5915L6.5 4Z"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-sm translate-x-[2%] -translate-y-[6%] bg-linear-to-r from-[hsl(0,0%,65%)] to-[hsl(0,0%,26%)] hover:bg-linear-to-r hover:from-[hsl(0,0%,100%)] hover:to-[hsl(0,0%,100%)] focus-visible:bg-linear-to-r focus-visible:from-[hsl(0,0%,100%)] focus-visible:to-[hsl(0,0%,100%)] bg-clip-text transition-colors duration-250">
                How May We Serve You?
              </span>
            </>
          )}
        </button>
        <div className="bodydrop relative inset-0 bg-[hsl(260,0%,6%)] hover:bg-[hsl(260,97%,6%)] focus-visible:bg-[hsl(260,97%,6%)] z-[-1] transition-colors duration-250" />
        <span
          ref={particlePenRef}
          aria-hidden="true"
          className="particle-pen absolute w-[200%] aspect-square top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 [mask:radial-gradient(white,transparent_65%)] z-[-1] opacity-0 hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-250"
        >
          {Array.from({ length: 10 }).map((_, i) => (
            <svg
              key={i}
              className={`particle w-[calc(var(--size,0.25)*1rem)] aspect-square absolute top-[calc(var(--y)*1%)] left-[calc(var(--x)*1%)] opacity-(--alpha,1) animate-float-out [animation-duration:calc(var(--duration,1)*1s)] [animation-delay:calc(var(--delay,1)*-1s)] origin-[var(--origin-x,1000%)_var(--origin-y,1000%)] z-[-1] ${i % 2 === 0 ? 'animate-[float-out_reverse]' : ''}`}
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6.937 3.846L7.75 1L8.563 3.846C8.77313 4.58114 9.1671 5.25062 9.70774 5.79126C10.2484 6.3319 10.9179 6.72587 11.653 6.936L14.5 7.75L11.654 8.563C10.9189 8.77313 10.2494 9.1671 9.70874 9.70774C9.1681 10.2484 8.77413 10.9179 8.564 11.653L7.75 14.5L6.937 11.654C6.72687 10.9189 6.3329 10.2494 5.79226 9.70874C5.25162 9.1681 4.58214 8.77413 3.847 8.564L1 7.75L3.846 6.937C4.58114 6.72687 5.25062 6.3329 5.79126 5.79226C6.3319 5.25162 6.72587 4.58214 6.936 3.847L6.937 3.846Z"
                fill="hsl(260,97%,70%)"
                stroke="none"
              />
            </svg>
          ))}
        </span>
      </div>

        {/* Agent selection modal */}
    {showAgents && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300">
        <div className="relative w-full max-w-md mx-4 bg-[hsl(260,97%,12%)] rounded-xl shadow-[0_0_2em_1em_hsl(260,97%,61%/0.3)] overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-[hsl(260,97%,50%/0.3)]">
            <h2 className="text-base font-bold text-white text-center">Select Assistant</h2>
            <p className="text-xs text-gray-400 text-center mt-0.5">Choose an agent for Cypress Resort</p>
          </div>

          {/* Scrollable list */}
          <div className="max-h-64 overflow-y-auto space-y-2 p-2">
            {agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => handleSelectAgent(agent)}
                className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(260,97%,20%/0.3)] hover:bg-[hsl(260,97%,20%)] cursor-pointer transition-all duration-250 hover:scale-102 hover:shadow-[0_0_1em_hsl(260,97%,61%/0.3)]"
              >
                <img
                  src={agent.avatar}
                  alt={`${agent.displayName} avatar`}
                  className="w-10 h-10 rounded-full object-cover border border-[hsl(260,97%,50%/0.3)]"
                />
                <div>
                  <h3 className="text-sm font-semibold text-white">{agent.displayName}</h3>
                  <p className="text-xs text-gray-300">{agent.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Close button */}
          <button
            onClick={() => setShowAgents(false)}
            className="absolute top-1 right-1 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    )}
    </>
  );
}