/// <reference types="@cloudflare/workers-types" />

import type { CalendarEvent, Env } from './types'

import { getAllEvents, getEventsByAddress } from './database'

export const generateICalendar = async (env: Env, address?: string): Promise<string> => {
  const events = address ? await getEventsByAddress(env.DB, address) : await getAllEvents(env.DB)

  const calendarName = address ? `${env.CALENDAR_NAME} - ${address}` : env.CALENDAR_NAME

  const calendarDescription = address
    ? `${env.CALENDAR_DESCRIPTION} for ${address}`
    : env.CALENDAR_DESCRIPTION

  const calendarLines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ice Calendar Worker//EN',
    `X-WR-CALNAME:${calendarName}`,
    `X-WR-CALDESC:${calendarDescription}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const event of events) {
    calendarLines.push(...generateEventLines(event))
  }

  calendarLines.push('END:VCALENDAR')

  return calendarLines.join('\r\n')
}

const generateEventLines = (event: CalendarEvent): string[] => {
  const lines: string[] = []

  lines.push('BEGIN:VEVENT')
  lines.push(`UID:${event.id}`)
  lines.push(`DTSTAMP:${formatDateForICal(event.created)}`)
  lines.push(`DTSTART:${formatDateForICal(event.start)}`)
  lines.push(`DTEND:${formatDateForICal(event.end)}`)
  lines.push(`SUMMARY:${escapeText(event.title)}`)

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeText(event.description)}`)
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeText(event.location)}`)
  }

  if (event.organizer) {
    lines.push(`ORGANIZER:mailto:${event.organizer}`)
  }

  if (event.attendees && event.attendees.length > 0) {
    for (const attendee of event.attendees) {
      lines.push(`ATTENDEE:mailto:${attendee}`)
    }
  }

  lines.push(`CREATED:${formatDateForICal(event.created)}`)
  lines.push(`LAST-MODIFIED:${formatDateForICal(event.modified)}`)
  lines.push('STATUS:CONFIRMED')
  lines.push('TRANSP:OPAQUE')
  lines.push('END:VEVENT')

  return lines
}

const formatDateForICal = (date: Date): string => {
  // Format: YYYYMMDDTHHMMSSZ
  return date
    .toISOString()
    .replace(/[:-]/g, '')
    .replace(/\.\d{3}/, '')
}

const escapeText = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
}

export const generateCalendarResponse = (icalContent: string, address?: string): Response => {
  const filename = address ? `calendar-${address.replace(/[^\dA-Za-z]/g, '_')}.ics` : 'calendar.ics'

  return new Response(icalContent, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': 'text/calendar; charset=utf-8',
      Expires: '0',
      Pragma: 'no-cache',
    },
  })
}
