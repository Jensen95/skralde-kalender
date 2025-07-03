/// <reference types="@cloudflare/workers-types" />

import type { CalendarEvent } from './types'

export const generateEventId = (): string => {
  return `event-${Date.now()}-${Math.random().toString(36).slice(2, 15)}`
}

export const formatDateForStorage = (date: Date): string => {
  return date.toISOString()
}

export const parseDateFromStorage = (dateString: string): Date => {
  return new Date(dateString)
}

export const storeEvent = async (db: D1Database, event: CalendarEvent): Promise<void> => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO calendar_events (
      id, title, description, start_date, end_date, location, 
      organizer, attendees, created_at, modified_at, event_type, source_email
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  await stmt
    .bind(
      event.id,
      event.title,
      event.description || null,
      formatDateForStorage(event.start),
      formatDateForStorage(event.end),
      event.location || null,
      event.organizer || null,
      JSON.stringify(event.attendees || []),
      formatDateForStorage(event.created),
      formatDateForStorage(event.modified),
      (event as unknown as { eventType?: string }).eventType || 'general',
      (event as unknown as { sourceEmail?: string }).sourceEmail || null
    )
    .run()
}

export const getEvent = async (db: D1Database, eventId: string): Promise<CalendarEvent | null> => {
  const stmt = db.prepare('SELECT * FROM calendar_events WHERE id = ?')
  const result = await stmt.bind(eventId).first()

  if (!result) {
    return null
  }

  return dbRowToEvent(result)
}

export const getAllEvents = async (db: D1Database): Promise<CalendarEvent[]> => {
  const stmt = db.prepare('SELECT * FROM calendar_events ORDER BY start_date ASC')
  const result = await stmt.all()

  return result.results.map(dbRowToEvent)
}

export const getEventsByAddress = async (
  db: D1Database,
  address: string
): Promise<CalendarEvent[]> => {
  const stmt = db.prepare(`
    SELECT * FROM calendar_events 
    WHERE location LIKE ?
    ORDER BY start_date ASC
  `)

  const searchPattern = `%${address}%`
  const result = await stmt.bind(searchPattern).all()

  return result.results.map(dbRowToEvent)
}

export const getEventsByDateRange = async (
  db: D1Database,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> => {
  const stmt = db.prepare(`
    SELECT * FROM calendar_events 
    WHERE start_date >= ? AND start_date <= ?
    ORDER BY start_date ASC
  `)

  const result = await stmt
    .bind(formatDateForStorage(startDate), formatDateForStorage(endDate))
    .all()

  return result.results.map(dbRowToEvent)
}

export const getEventsByType = async (
  db: D1Database,
  eventType: string
): Promise<CalendarEvent[]> => {
  const stmt = db.prepare(`
    SELECT * FROM calendar_events 
    WHERE event_type = ?
    ORDER BY start_date ASC
  `)

  const result = await stmt.bind(eventType).all()
  return result.results.map(dbRowToEvent)
}

export const deleteEvent = async (db: D1Database, eventId: string): Promise<boolean> => {
  const stmt = db.prepare('DELETE FROM calendar_events WHERE id = ?')
  const result = await stmt.bind(eventId).run()

  return result.meta.changes > 0
}

export const searchEvents = async (db: D1Database, query: string): Promise<CalendarEvent[]> => {
  const stmt = db.prepare(`
    SELECT * FROM calendar_events 
    WHERE title LIKE ? OR description LIKE ? OR location LIKE ?
    ORDER BY start_date ASC
  `)

  const searchPattern = `%${query}%`
  const result = await stmt.bind(searchPattern, searchPattern, searchPattern).all()

  return result.results.map(dbRowToEvent)
}

const dbRowToEvent = (row: Record<string, unknown>): CalendarEvent => {
  return {
    attendees: row.attendees ? JSON.parse(row.attendees as string) : undefined,
    created: parseDateFromStorage(row.created_at as string),
    description: (row.description as string) || undefined,
    end: parseDateFromStorage(row.end_date as string),
    id: row.id as string,
    location: (row.location as string) || undefined,
    modified: parseDateFromStorage(row.modified_at as string),
    organizer: (row.organizer as string) || undefined,
    start: parseDateFromStorage(row.start_date as string),
    title: row.title as string,
  }
}
