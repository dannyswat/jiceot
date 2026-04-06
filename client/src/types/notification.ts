export interface NotificationSetting {
  id: number
  user_id: number
  bark_url: string
  enabled: boolean
  reminder_time: string
  timezone: string
  due_days_ahead: number
  last_notified_at: string | null
  created_at: string
  updated_at: string
}

export interface UpdateNotificationSettingRequest {
  bark_url?: string
  enabled?: boolean
  reminder_time?: string
  timezone?: string
  due_days_ahead?: number
}
