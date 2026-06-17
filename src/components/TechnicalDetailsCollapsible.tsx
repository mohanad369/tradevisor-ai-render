import { useState } from "react"
import type { ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, ChevronUp, Settings } from "lucide-react"
import { useLanguage } from "@/lib/language"

/**
 * TechnicalDetailsCollapsible
 * ───────────────────────────
 * A simple "show more / hide" wrapper for the technical agent panels.
 *
 * By default it's COLLAPSED. The everyday user sees the analysis,
 * the smart summary, and a button. Power users tap the button to
 * unlock all the panels (Gold Flow, Fractal, Bull/Bear Debate, etc.).
 *
 * This is the single biggest UX cleanup we can ship: 90% of users
 * never wanted to see those panels — they just wanted a clear trade
 * to take. Power users still get everything, just one click away.
 *
 * State is per-component (useState), not persisted — every analysis
 * starts collapsed by default. This is intentional: the user shouldn't
 * have to scroll past walls of detail to find the next trade.
 */

interface Props {
  children: ReactNode
  /** Override the default count label if the parent knows better. */
  panelCount?: number
}

export default function TechnicalDetailsCollapsible({ children, panelCount }: Props) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d] hover:bg-[#141414] transition-colors"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-[#a0a0a0]">
          <Settings size={14} className="text-[#666666]" />
          {open ? t("techDetails.hide") : t("techDetails.show")}
          {panelCount !== undefined && (
            <span className="text-[10px] text-[#666666] font-normal">
              ({panelCount})
            </span>
          )}
        </span>
        {open
          ? <ChevronUp size={16} className="text-[#666666]" />
          : <ChevronDown size={16} className="text-[#666666]" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
