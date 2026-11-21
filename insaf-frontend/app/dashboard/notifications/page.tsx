'use client'
import { NotificationList } from '../../Notifications'

// Full list of notifications, opened from Settings or "See all" in the bell
export default function NotificationsPage() {
  return (
    <div>
      <h1>Notifications</h1>
      <p>Updates about your appointments and CNIC. Reminders show for accepted appointments in the next 24 hours.</p>
      <NotificationList />
    </div>
  )
}
