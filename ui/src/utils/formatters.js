/**
 * Format large numbers with K, M, B suffixes
 * Examples:
 *   1234 -> 1.2K
 *   12345 -> 12.3K
 *   123456 -> 123K
 *   1234567 -> 1.2M
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0'

  const absNum = Math.abs(num)

  // Less than 1000 - show as is
  if (absNum < 1000) {
    return num.toString()
  }

  // 1K - 999K
  if (absNum < 1000000) {
    const k = num / 1000
    // If it's a round number (like 1000, 2000), show without decimals
    if (k % 1 === 0) {
      return `${Math.floor(k)}K`
    }
    // If less than 10K, show one decimal
    if (absNum < 10000) {
      return `${k.toFixed(1)}K`
    }
    // Otherwise show without decimals
    return `${Math.floor(k)}K`
  }

  // 1M - 999M
  if (absNum < 1000000000) {
    const m = num / 1000000
    if (m % 1 === 0) {
      return `${Math.floor(m)}M`
    }
    if (absNum < 10000000) {
      return `${m.toFixed(1)}M`
    }
    return `${Math.floor(m)}M`
  }

  // 1B+
  const b = num / 1000000000
  if (b % 1 === 0) {
    return `${Math.floor(b)}B`
  }
  if (absNum < 10000000000) {
    return `${b.toFixed(1)}B`
  }
  return `${Math.floor(b)}B`
}

/**
 * Format minutes to hours/days if needed
 * Examples:
 *   59 minutes -> "59 мин"
 *   600 minutes (10 hours) -> "10 ч"
 *   1500 minutes (25 hours) -> "25 ч"
 *   3000 minutes (50 hours) -> "2 дня"
 *   14400 minutes (240 hours) -> "10 дней"
 */
export const formatMinutes = (minutes, translate) => {
  if (!minutes || minutes === 0) return '0'

  // Less than 10 hours (600 minutes) - show in minutes
  if (minutes < 600) {
    return translate('wrapped.stats.minutesValue', { count: Math.floor(minutes) })
  }

  const hours = Math.floor(minutes / 60)

  // Less than 48 hours (2 days) - show in hours
  if (hours < 48) {
    return translate('wrapped.stats.hoursValue', { count: hours })
  }

  // 48+ hours - show in days
  const days = Math.floor(hours / 24)
  return translate('wrapped.stats.daysValue', { count: days })
}

/**
 * Format minutes and return separate value and label for styling
 * Returns: { value: '599', label: 'мин' } or { value: '20', label: 'ч' }
 */
export const formatMinutesParts = (minutes, translate) => {
  if (!minutes || minutes === 0) {
    return { value: '0', label: translate('wrapped.stats.minutes') }
  }

  // Less than 10 hours (600 minutes) - show in minutes
  if (minutes < 600) {
    return {
      value: Math.floor(minutes).toString(),
      label: translate('wrapped.stats.minutes'),
    }
  }

  const hours = Math.floor(minutes / 60)

  // Less than 48 hours (2 days) - show in hours
  if (hours < 48) {
    return {
      value: hours.toString(),
      label: translate('wrapped.stats.hours'),
    }
  }

  // 48+ hours - show in days
  const days = Math.floor(hours / 24)
  return {
    value: days.toString(),
    label: translate('wrapped.stats.days'),
  }
}

/**
 * Format play count for display
 * Same as formatNumber but with optional suffix
 */
export const formatPlayCount = (count) => {
  return formatNumber(count)
}

/**
 * Format bytes to human-readable file size
 * Examples:
 *   1024 -> "1.00 KB"
 *   1048576 -> "1.00 MB"
 */
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Format duration in seconds to HH:MM:SS format
 * Examples:
 *   90 -> "01:30"
 *   3661 -> "01:01:01"
 */
export const formatDuration = (d) => {
  d = Math.round(d)
  const days = Math.floor(d / 86400)
  const hours = Math.floor(d / 3600) % 24
  const minutes = Math.floor(d / 60) % 60
  const seconds = Math.floor(d % 60)
  const f = [hours, minutes, seconds]
    .map((v) => v.toString())
    .map((v) => (v.length !== 2 ? '0' + v : v))
    .filter((v, i) => v !== '00' || i > 0 || days > 0)
    .join(':')

  return `${days > 0 ? days + ':' : ''}${f}`
}

/**
 * Format duration in seconds to human-readable format (e.g., "2d 3h 15m")
 */
export const formatDuration2 = (totalSeconds) => {
  if (totalSeconds == null || totalSeconds < 0) {
    return '0s'
  }
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)

  const parts = []

  if (days > 0) {
    // When days are present, show only d h m (3 levels max)
    parts.push(`${days}d`)
    if (hours > 0) {
      parts.push(`${hours}h`)
    }
    if (minutes > 0) {
      parts.push(`${minutes}m`)
    }
  } else {
    // When no days, show h m s (3 levels max)
    if (hours > 0) {
      parts.push(`${hours}h`)
    }
    if (minutes > 0) {
      parts.push(`${minutes}m`)
    }
    if (seconds > 0 || parts.length === 0) {
      parts.push(`${seconds}s`)
    }
  }

  return parts.join(' ')
}

/**
 * Format short duration from nanoseconds (e.g., "3h15m" or "45s")
 */
export const formatShortDuration = (ns) => {
  // Convert nanoseconds to seconds
  const seconds = ns / 1e9
  if (seconds < 1.0) {
    return '<1s'
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}h${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m${secs}s`
  }
  return `${secs}s`
}

/**
 * Format full date with locale support
 * Examples:
 *   "2024" -> "2024"
 *   "2024-03" -> "Mar 2024"
 *   "2024-03-15" -> "Mar 15, 2024"
 */
export const formatFullDate = (date, locale) => {
  const dashes = date.split('-').length - 1
  let options = {
    year: 'numeric',
    timeZone: 'UTC',
    ...(dashes > 0 && { month: 'short' }),
    ...(dashes > 1 && { day: 'numeric' }),
  }
  if (dashes > 2 || (dashes === 0 && date.length > 4)) {
    return ''
  }
  return new Date(date).toLocaleDateString(locale, options)
}
