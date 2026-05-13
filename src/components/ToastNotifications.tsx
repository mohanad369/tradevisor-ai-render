import { useState, useCallback, createContext, useContext } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react"

type ToastType = "success" | "error" | "warning" | "info"

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  addToast: (message: string, type: ToastType) => void
}

const ToastContext = createContext<ToastContextType>({ addToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let toastIdCounter = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `toast-${++toastIdCounter}-${Date.now()}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const icons = {
    success: <CheckCircle size={16} className="text-[#22c55e]" />,
    error: <XCircle size={16} className="text-[#e11d48]" />,
    warning: <AlertTriangle size={16} className="text-[#f59e0b]" />,
    info: <Info size={16} className="text-[#3b82f6]" />,
  }

  const borders = {
    success: "border-[#22c55e]/30",
    error: "border-[#e11d48]/30",
    warning: "border-[#f59e0b]/30",
    info: "border-[#3b82f6]/30",
  }

  const bgColors = {
    success: "bg-[#22c55e]/10",
    error: "bg-[#e11d48]/10",
    warning: "bg-[#f59e0b]/10",
    info: "bg-[#3b82f6]/10",
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 60, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      className={`pointer-events-auto flex items-center gap-2.5 bg-[#0d0d0d] ${borders[toast.type]} border rounded-xl px-4 py-3 shadow-2xl min-w-[280px] max-w-[380px]`}
    >
      <div className={`w-7 h-7 ${bgColors[toast.type]} rounded-lg flex items-center justify-center flex-shrink-0`}>
        {icons[toast.type]}
      </div>
      <p className="text-white text-xs font-medium flex-1 leading-relaxed">{toast.message}</p>
      <button onClick={() => onRemove(toast.id)} className="text-[#666666] hover:text-white flex-shrink-0">
        <X size={13} />
      </button>
    </motion.div>
  )
}
