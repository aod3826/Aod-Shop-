import React, { useState, useEffect } from 'react'
import { Activity, AlertCircle, CheckCircle, XCircle, Clock, User } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'
import LoadingSpinner from '../common/LoadingSpinner'

interface ActivityLog {
  id: string
  action_type: string
  user_id: string | null
  table_name: string | null
  record_id: string | null
  error_message: string | null
  created_at: string
  user: {
    display_name: string
  } | null
}

const ActivityLog: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const ITEMS_PER_PAGE = 20

  useEffect(() => {
    fetchLogs()
  }, [filter, page])

  const fetchLogs = async () => {
    try {
      setIsLoading(true)
      
      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          user:profiles(display_name)
        `)
        .order('created_at', { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1)
      
      if (filter === 'error') {
        query = query.not('error_message', 'is', null)
      } else if (filter === 'order') {
        query = query.eq('table_name', 'orders')
      } else if (filter === 'payment') {
        query = query.like('action_type', '%PAYMENT%')
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      setLogs(prev => page === 1 ? data || [] : [...prev, ...(data || [])])
      setHasMore((data?.length || 0) === ITEMS_PER_PAGE)
    } catch (error) {
      console.error('Failed to fetch activity logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getActionIcon = (actionType: string) => {
    if (actionType.includes('ERROR') || actionType.includes('FAILED')) {
      return <XCircle className="w-5 h-5 text-destructive" />
    }
    if (actionType.includes('SUCCESS') || actionType.includes('VERIFIED')) {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    }
    return <Activity className="w-5 h-5 text-blue-500" />
  }

  const getActionColor = (actionType: string) => {
    if (actionType.includes('ERROR') || actionType.includes('FAILED')) {
      return 'bg-destructive/10 text-destructive'
    }
    if (actionType.includes('SUCCESS') || actionType.includes('VERIFIED')) {
      return 'bg-green-100 text-green-800'
    }
    return 'bg-blue-100 text-blue-800'
  }

  const formatActionType = (actionType: string) => {
    return actionType.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Activity Logs</h2>
          <p className="text-muted-foreground">
            System events and API errors
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {['all', 'error', 'order', 'payment'].map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f)
                  setPage(1)
                }}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${filter === f 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }
                `}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action_type)}
                      <div>
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action_type)}`}>
                          {formatActionType(log.action_type)}
                        </div>
                        {log.table_name && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {log.table_name}
                            {log.record_id && ` · ${log.record_id.slice(0, 8)}...`}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    {log.user ? (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{log.user.display_name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">System</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      {log.error_message ? (
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-destructive break-words">
                            {log.error_message}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {log.action_type.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {formatDistanceToNow(new Date(log.created_at), {
                        addSuffix: true,
                        locale: th,
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {isLoading && (
          <div className="p-8 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        )}
        
        {logs.length === 0 && !isLoading && (
          <div className="p-8 text-center text-muted-foreground">
            No activity logs found
          </div>
        )}
      </div>
      
      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={() => setPage(prev => prev + 1)}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg border border-input hover:bg-accent transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  )
}

export default ActivityLog
