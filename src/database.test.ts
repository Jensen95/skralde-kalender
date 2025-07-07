import { beforeEach, describe, expect, vi } from 'vitest'

import type { CalendarEvent } from './types'

import {
  deleteEvent,
  formatDateForStorage,
  generateEventId,
  getAllEvents,
  getEvent,
  getEventsByAddress,
  getEventsByType,
  parseDateFromStorage,
  searchEvents,
  storeEvent,
} from './database'

// Mock D1Database
const mockD1 = {
  prepare: vi.fn(),
  exec: vi.fn(),
}

const mockStatement = {
  bind: vi.fn(),
  run: vi.fn(),
  first: vi.fn(),
  all: vi.fn(),
}

describe('Database Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockD1.prepare.mockReturnValue(mockStatement)
    mockStatement.bind.mockReturnValue(mockStatement)
  })

  const sampleEvent: CalendarEvent = {
    id: 'test-event-1',
    title: 'Storskrald afhentning',
    description: 'Test waste collection',
    start: new Date('2025-07-07T07:00:00Z'),
    end: new Date('2025-07-07T08:00:00Z'),
    location: 'Nøddeskellet 8, 2730 Herlev',
    organizer: 'waste@municipality.dk',
    attendees: ['user@example.com'],
    created: new Date('2025-01-01T00:00:00Z'),
    modified: new Date('2025-01-01T00:00:00Z'),
  }

  describe('generateEventId', () => {
    it('should generate unique event IDs', () => {
      const id1 = generateEventId()
      const id2 = generateEventId()

      expect(id1).toMatch(/^event-\d+-[\da-z]+$/)
      expect(id2).toMatch(/^event-\d+-[\da-z]+$/)
      expect(id1).not.toBe(id2)
    })

    it('should include timestamp in ID', () => {
      const beforeTime = Date.now()
      const id = generateEventId()
      const afterTime = Date.now()

      const timestamp = Number.parseInt(id.split('-')[1])
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime)
      expect(timestamp).toBeLessThanOrEqual(afterTime)
    })
  })

  describe('Date formatting', () => {
    it('should format dates for storage as ISO strings', () => {
      const date = new Date('2025-07-07T07:00:00Z')
      const formatted = formatDateForStorage(date)

      expect(formatted).toBe('2025-07-07T07:00:00.000Z')
    })

    it('should parse dates from storage', () => {
      const dateString = '2025-07-07T07:00:00.000Z'
      const parsed = parseDateFromStorage(dateString)

      expect(parsed).toBeInstanceOf(Date)
      expect(parsed.getFullYear()).toBe(2025)
      expect(parsed.getMonth()).toBe(6) // July (0-indexed)
      expect(parsed.getDate()).toBe(7)
      expect(parsed.getUTCHours()).toBe(7)
    })

    it('should handle round-trip date conversion', () => {
      const originalDate = new Date('2025-07-07T07:00:00Z')
      const formatted = formatDateForStorage(originalDate)
      const parsed = parseDateFromStorage(formatted)

      expect(parsed.getTime()).toBe(originalDate.getTime())
    })
  })

  describe('storeEvent', () => {
    it('should prepare correct SQL statement', async () => {
      mockStatement.run.mockResolvedValue({ success: true })

      await storeEvent(mockD1 as any, sampleEvent)

      expect(mockD1.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO calendar_events')
      )
      expect(mockStatement.bind).toHaveBeenCalledWith(
        'test-event-1',
        'Storskrald afhentning',
        'Test waste collection',
        '2025-07-07T07:00:00.000Z',
        '2025-07-07T08:00:00.000Z',
        'Nøddeskellet 8, 2730 Herlev',
        'waste@municipality.dk',
        '["user@example.com"]',
        '2025-01-01T00:00:00.000Z',
        '2025-01-01T00:00:00.000Z',
        'general',
        null
      )
      expect(mockStatement.run).toHaveBeenCalled()
    })

    it('should handle events with extended properties', async () => {
      const extendedEvent = {
        ...sampleEvent,
        eventType: 'storskrald',
        sourceEmail: 'Original email content...',
      }

      await storeEvent(mockD1 as any, extendedEvent as any)

      expect(mockStatement.bind).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        'storskrald',
        'Original email content...'
      )
    })

    it('should handle events with null values', async () => {
      const minimalEvent: CalendarEvent = {
        id: 'minimal-event',
        title: 'Minimal Event',
        start: new Date('2025-07-07T07:00:00Z'),
        end: new Date('2025-07-07T08:00:00Z'),
        created: new Date('2025-01-01T00:00:00Z'),
        modified: new Date('2025-01-01T00:00:00Z'),
      }

      await storeEvent(mockD1 as any, minimalEvent)

      expect(mockStatement.bind).toHaveBeenCalledWith(
        'minimal-event',
        'Minimal Event',
        null, // description
        '2025-07-07T07:00:00.000Z',
        '2025-07-07T08:00:00.000Z',
        null, // location
        null, // organizer
        '[]', // attendees
        '2025-01-01T00:00:00.000Z',
        '2025-01-01T00:00:00.000Z',
        'general',
        null
      )
    })
  })

  describe('getEvent', () => {
    it('should retrieve event by ID', async () => {
      const mockRow = {
        id: 'test-event-1',
        title: 'Storskrald afhentning',
        description: 'Test waste collection',
        start_date: '2025-07-07T07:00:00.000Z',
        end_date: '2025-07-07T08:00:00.000Z',
        location: 'Nøddeskellet 8, 2730 Herlev',
        organizer: 'waste@municipality.dk',
        attendees: '["user@example.com"]',
        created_at: '2025-01-01T00:00:00.000Z',
        modified_at: '2025-01-01T00:00:00.000Z',
      }

      mockStatement.first.mockResolvedValue(mockRow)

      const event = await getEvent(mockD1 as any, 'test-event-1')

      expect(mockD1.prepare).toHaveBeenCalledWith('SELECT * FROM calendar_events WHERE id = ?')
      expect(mockStatement.bind).toHaveBeenCalledWith('test-event-1')
      expect(event).toStrictEqual({
        id: 'test-event-1',
        title: 'Storskrald afhentning',
        description: 'Test waste collection',
        start: new Date('2025-07-07T07:00:00.000Z'),
        end: new Date('2025-07-07T08:00:00.000Z'),
        location: 'Nøddeskellet 8, 2730 Herlev',
        organizer: 'waste@municipality.dk',
        attendees: ['user@example.com'],
        created: new Date('2025-01-01T00:00:00.000Z'),
        modified: new Date('2025-01-01T00:00:00.000Z'),
      })
    })

    it('should return null for non-existent event', async () => {
      mockStatement.first.mockResolvedValue(null)

      const event = await getEvent(mockD1 as any, 'non-existent')

      expect(event).toBeNull()
    })

    it('should handle events with null optional fields', async () => {
      const mockRow = {
        id: 'minimal-event',
        title: 'Minimal Event',
        description: null,
        start_date: '2025-07-07T07:00:00.000Z',
        end_date: '2025-07-07T08:00:00.000Z',
        location: null,
        organizer: null,
        attendees: null,
        created_at: '2025-01-01T00:00:00.000Z',
        modified_at: '2025-01-01T00:00:00.000Z',
      }

      mockStatement.first.mockResolvedValue(mockRow)

      const event = await getEvent(mockD1 as any, 'minimal-event')

      expect(event?.description).toBeUndefined()
      expect(event?.location).toBeUndefined()
      expect(event?.organizer).toBeUndefined()
      expect(event?.attendees).toBeUndefined()
    })
  })

  describe('getAllEvents', () => {
    it('should retrieve all events ordered by start date', async () => {
      const mockResults = {
        results: [
          {
            id: 'event-1',
            title: 'First Event',
            start_date: '2025-07-07T07:00:00.000Z',
            end_date: '2025-07-07T08:00:00.000Z',
            created_at: '2025-01-01T00:00:00.000Z',
            modified_at: '2025-01-01T00:00:00.000Z',
          },
          {
            id: 'event-2',
            title: 'Second Event',
            start_date: '2025-07-08T07:00:00.000Z',
            end_date: '2025-07-08T08:00:00.000Z',
            created_at: '2025-01-01T00:00:00.000Z',
            modified_at: '2025-01-01T00:00:00.000Z',
          },
        ],
      }

      mockStatement.all.mockResolvedValue(mockResults)

      const events = await getAllEvents(mockD1 as any)

      expect(mockD1.prepare).toHaveBeenCalledWith(
        'SELECT * FROM calendar_events ORDER BY start_date ASC'
      )
      expect(events).toHaveLength(2)
      expect(events[0].title).toBe('First Event')
      expect(events[1].title).toBe('Second Event')
    })
  })

  describe('getEventsByAddress', () => {
    it('should filter events by address using LIKE', async () => {
      const mockResults = {
        results: [
          {
            id: 'event-1',
            title: 'Storskrald afhentning',
            location: 'Nøddeskellet 8, 2730 Herlev',
            start_date: '2025-07-07T07:00:00.000Z',
            end_date: '2025-07-07T08:00:00.000Z',
            created_at: '2025-01-01T00:00:00.000Z',
            modified_at: '2025-01-01T00:00:00.000Z',
          },
        ],
      }

      mockStatement.all.mockResolvedValue(mockResults)

      const events = await getEventsByAddress(mockD1 as any, 'Nøddeskellet 8')

      expect(mockD1.prepare).toHaveBeenCalledWith(expect.stringContaining('WHERE location LIKE ?'))
      expect(mockStatement.bind).toHaveBeenCalledWith('%Nøddeskellet 8%')
      expect(events).toHaveLength(1)
      expect(events[0].location).toBe('Nøddeskellet 8, 2730 Herlev')
    })
  })

  describe('getEventsByType', () => {
    it('should filter events by type', async () => {
      const mockResults = {
        results: [
          {
            id: 'event-1',
            title: 'Storskrald afhentning',
            event_type: 'storskrald',
            start_date: '2025-07-07T07:00:00.000Z',
            end_date: '2025-07-07T08:00:00.000Z',
            created_at: '2025-01-01T00:00:00.000Z',
            modified_at: '2025-01-01T00:00:00.000Z',
          },
        ],
      }

      mockStatement.all.mockResolvedValue(mockResults)

      const events = await getEventsByType(mockD1 as any, 'storskrald')

      expect(mockD1.prepare).toHaveBeenCalledWith(expect.stringContaining('WHERE event_type = ?'))
      expect(mockStatement.bind).toHaveBeenCalledWith('storskrald')
      expect(events).toHaveLength(1)
    })
  })

  describe('deleteEvent', () => {
    it('should delete event and return true if successful', async () => {
      mockStatement.run.mockResolvedValue({ meta: { changes: 1 } })

      const result = await deleteEvent(mockD1 as any, 'test-event-1')

      expect(mockD1.prepare).toHaveBeenCalledWith('DELETE FROM calendar_events WHERE id = ?')
      expect(mockStatement.bind).toHaveBeenCalledWith('test-event-1')
      expect(result).toBe(true)
    })

    it('should return false if no event was deleted', async () => {
      mockStatement.run.mockResolvedValue({ meta: { changes: 0 } })

      const result = await deleteEvent(mockD1 as any, 'non-existent')

      expect(result).toBe(false)
    })
  })

  describe('searchEvents', () => {
    it('should search events by title, description, and location', async () => {
      const mockResults = {
        results: [
          {
            id: 'event-1',
            title: 'Storskrald afhentning',
            description: 'Waste collection',
            location: 'Nøddeskellet 8',
            start_date: '2025-07-07T07:00:00.000Z',
            end_date: '2025-07-07T08:00:00.000Z',
            created_at: '2025-01-01T00:00:00.000Z',
            modified_at: '2025-01-01T00:00:00.000Z',
          },
        ],
      }

      mockStatement.all.mockResolvedValue(mockResults)

      const events = await searchEvents(mockD1 as any, 'storskrald')

      expect(mockD1.prepare).toHaveBeenCalledWith(
        expect.stringContaining('title LIKE ? OR description LIKE ? OR location LIKE ?')
      )
      expect(mockStatement.bind).toHaveBeenCalledWith(
        '%storskrald%',
        '%storskrald%',
        '%storskrald%'
      )
      expect(events).toHaveLength(1)
    })
  })
})
