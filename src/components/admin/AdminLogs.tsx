'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { ShieldCheck, Activity } from 'lucide-react'
import { timeAgo } from '@/lib/time-utils'

export function AdminLogs() {
  const { t, isRTL } = useI18n()
  const [tab, setTab] = useState<'activity' | 'security'>('activity')

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex gap-2">
        <button
          onClick={() => setTab('activity')}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${tab === 'activity' ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' : 'glass text-white/60'}`}
        >
          <Activity className="w-4 h-4" />
          {t('activityLog')}
        </button>
        <button
          onClick={() => setTab('security')}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${tab === 'security' ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' : 'glass text-white/60'}`}
        >
          <ShieldCheck className="w-4 h-4" />
          {t('securityLogs')}
        </button>
      </div>

      <LogsList key={tab} section={tab === 'activity' ? 'activity_logs' : 'security_logs'} />
    </div>
  )
}

function LogsList({ section }: { section: string }) {
  const { t, locale } = useI18n()
  const [logs, setLogs] = useState<any[] | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`/api/admin?section=${section}`)
        const data = await res.json()
        if (!cancelled) setLogs(data.logs || [])
      } catch {
        if (!cancelled) setLogs([])
      }
    }
    load()
    return () => { cancelled = true }
  }, [section])

  return (
    <div className="glass rounded-2xl p-4">
      {logs === null ? (
        <div className="p-8 text-center text-white/40">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center text-white/40">{t('noData')}</div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scroll">
          {logs.map((log) => (
            <div key={log.id} className="glass rounded-xl p-3 flex items-start justify-between gap-2">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2" />
                <div>
                  {section === 'activity_logs' ? (
                    <>
                      <p className="text-xs font-medium text-white">{log.action}</p>
                      <p className="text-[10px] text-white/40">{log.userName} • {log.details}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-white">{log.eventType}</p>
                      <p className="text-[10px] text-white/40">{log.details}</p>
                    </>
                  )}
                  {log.ipAddress && (
                    <p className="text-[10px] text-white/30 font-mono">{log.ipAddress}</p>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-white/40 shrink-0">{timeAgo(log.createdAt, locale)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
