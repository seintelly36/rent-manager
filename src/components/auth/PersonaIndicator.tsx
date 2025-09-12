import React from 'react'
import { Shield, Users, RefreshCw } from 'lucide-react'

interface PersonaIndicatorProps {
  persona: 'admin' | 'staff'
  loginName?: string | null
  onSwitchPersona: () => void
}

export function PersonaIndicator({ persona, loginName, onSwitchPersona }: PersonaIndicatorProps) {
  return (
    <div className="flex items-center space-x-3 bg-slate-800 rounded-xl p-3 hover:bg-slate-700 transition-colors">
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
        persona === 'admin' 
          ? 'bg-gradient-to-br from-red-500 to-red-600' 
          : 'bg-gradient-to-br from-green-500 to-green-600'
      }`}>
        {persona === 'admin' ? (
          <Shield className="w-5 h-5 text-white" />
        ) : (
          <Users className="w-5 h-5 text-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white capitalize">
          {persona}
        </p>
        {loginName && (
          <p className="text-xs text-slate-300 truncate">
            {loginName}
          </p>
        )}
      </div>
      <button
        onClick={onSwitchPersona}
        className="flex-shrink-0 p-2 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg transition-colors"
        title="Switch Role"
      >
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  )
}