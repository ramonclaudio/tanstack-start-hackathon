import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

/**
 * Clean up stale pending reports every hour
 * Reports stuck in "pending" for more than 15 minutes are marked as failed
 */
crons.interval(
  'cleanup-stale-reports',
  { minutes: 60 },
  internal.coderabbit.cleanupStalePendingReports,
)

export default crons
