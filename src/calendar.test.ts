import { beforeEach, describe, expect, vi } from 'vitest'

import type { CalendarEvent, Env } from './types'

import { generateCalendarResponse, generateICalendar } from './calendar'
import { getAllEvents, getEventsByAddress } from './database'

// Mock database functions
vi.mock('./database', () => ({
  getAllEvents: vi.fn(),
  getEventsByAddress: vi.fn(),
}))

describe('Calendar Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockEnv: Env = {
    DB: {} as any,
    CALENDAR_NAME: 'Test Calendar',
    CALENDAR_DESCRIPTION: 'Test calendar for unit tests',
  }

  const mockEvents: CalendarEvent[] = [
    {
      id: 'event-1',
      title: 'Storskrald afhentning',
      description: 'Waste collection event',
      start: new Date('2025-07-07T07:00:00'),
      end: new Date('2025-07-07T08:00:00'),
      location: 'Nøddeskellet 8, 2730 Herlev',
      organizer: 'waste@municipality.dk',
      attendees: ['user@example.com'],
      created: new Date('2025-01-01T00:00:00'),
      modified: new Date('2025-01-01T00:00:00'),
    },
    {
      id: 'event-2',
      title: 'Team Meeting',
      description: 'Weekly team sync',
      start: new Date('2025-07-08T09:00:00'),
      end: new Date('2025-07-08T10:00:00'),
      location: 'Conference Room A',
      organizer: 'manager@company.com',
      attendees: ['team@company.com'],
      created: new Date('2025-01-01T00:00:00'),
      modified: new Date('2025-01-01T00:00:00'),
    },
  ]

  describe('generateICalendar', () => {
    test('should generate calendar with all events', async () => {
      vi.mocked(getAllEvents).mockResolvedValue(mockEvents)

      const icalContent = await generateICalendar(mockEnv)

      expect(icalContent).toContain('BEGIN:VCALENDAR')
      expect(icalContent).toContain('END:VCALENDAR')
      expect(icalContent).toContain('X-WR-CALNAME:Test Calendar')
      expect(icalContent).toContain('X-WR-CALDESC:Test calendar for unit tests')
      expect(icalContent).toContain('SUMMARY:Storskrald afhentning')
      expect(icalContent).toContain('SUMMARY:Team Meeting')
      expect(icalContent).toContain('LOCATION:Nøddeskellet 8\\, 2730 Herlev')
      expect(icalContent).toContain('LOCATION:Conference Room A')
    })

    test('should generate address-specific calendar', async () => {
      const addressEvents = [mockEvents[0]] // Only the Nøddeskellet event
      vi.mocked(getEventsByAddress).mockResolvedValue(addressEvents)

      const icalContent = await generateICalendar(mockEnv, 'Nøddeskellet 8')

      expect(icalContent).toContain('X-WR-CALNAME:Test Calendar - Nøddeskellet 8')
      expect(icalContent).toContain('X-WR-CALDESC:Test calendar for unit tests for Nøddeskellet 8')
      expect(icalContent).toContain('SUMMARY:Storskrald afhentning')
      expect(icalContent).not.toContain('SUMMARY:Team Meeting')
    })

    test('should handle empty event list', async () => {
      vi.mocked(getAllEvents).mockResolvedValue([])

      const icalContent = await generateICalendar(mockEnv)

      expect(icalContent).toContain('BEGIN:VCALENDAR')
      expect(icalContent).toContain('END:VCALENDAR')
      expect(icalContent).not.toContain('BEGIN:VEVENT')
    })

    test('should format dates correctly in 24-hour format', async () => {
      vi.mocked(getAllEvents).mockResolvedValue([mockEvents[0]])

      const icalContent = await generateICalendar(mockEnv)

      // Check for proper iCal date format (YYYYMMDDTHHMMSSZ)
      expect(icalContent).toContain('DTSTART:20250707T070000Z')
      expect(icalContent).toContain('DTEND:20250707T080000Z')
    })

    test('should escape special characters in text fields', async () => {
      const eventWithSpecialChars: CalendarEvent = {
        ...mockEvents[0],
        title: 'Event with; special, characters\nand newlines',
        description: 'Description with\nlinebreaks and; semicolons, commas',
      }

      vi.mocked(getAllEvents).mockResolvedValue([eventWithSpecialChars])

      const icalContent = await generateICalendar(mockEnv)

      expect(icalContent).toContain('SUMMARY:Event with\\; special\\, characters\\nand newlines')
      expect(icalContent).toContain(
        'DESCRIPTION:Description with\\nlinebreaks and\\; semicolons\\, commas'
      )
    })

    test('should include all required iCal fields', async () => {
      vi.mocked(getAllEvents).mockResolvedValue([mockEvents[0]])

      const icalContent = await generateICalendar(mockEnv)

      // Check for required calendar properties
      expect(icalContent).toContain('VERSION:2.0')
      expect(icalContent).toContain('PRODID:-//Ice Calendar Worker//EN')
      expect(icalContent).toContain('CALSCALE:GREGORIAN')
      expect(icalContent).toContain('METHOD:PUBLISH')

      // Check for required event properties
      expect(icalContent).toContain('BEGIN:VEVENT')
      expect(icalContent).toContain('END:VEVENT')
      expect(icalContent).toContain('UID:event-1')
      expect(icalContent).toContain('DTSTAMP:')
      expect(icalContent).toContain('DTSTART:')
      expect(icalContent).toContain('DTEND:')
      expect(icalContent).toContain('CREATED:')
      expect(icalContent).toContain('LAST-MODIFIED:')
      expect(icalContent).toContain('STATUS:CONFIRMED')
    })

    test('should handle optional fields correctly', async () => {
      const minimalEvent: CalendarEvent = {
        id: 'minimal-event',
        title: 'Minimal Event',
        start: new Date('2025-07-07T07:00:00'),
        end: new Date('2025-07-07T08:00:00'),
        created: new Date('2025-01-01T00:00:00'),
        modified: new Date('2025-01-01T00:00:00'),
        // No description, location, organizer, attendees
      }

      vi.mocked(getAllEvents).mockResolvedValue([minimalEvent])

      const icalContent = await generateICalendar(mockEnv)

      expect(icalContent).toContain('SUMMARY:Minimal Event')
      expect(icalContent).not.toContain('DESCRIPTION:')
      expect(icalContent).not.toContain('LOCATION:')
      expect(icalContent).not.toContain('ORGANIZER:')
      expect(icalContent).not.toContain('ATTENDEE:')
    })
  })

  describe('generateCalendarResponse', () => {
    const sampleICalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//EN
BEGIN:VEVENT
SUMMARY:Test Event
END:VEVENT
END:VCALENDAR`

    test('should generate response with default filename', () => {
      const response = generateCalendarResponse(sampleICalContent)

      expect(response.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8')
      expect(response.headers.get('Content-Disposition')).toBe(
        'attachment; filename="calendar.ics"'
      )
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
    })

    test('should generate response with address-specific filename', () => {
      const response = generateCalendarResponse(sampleICalContent, 'Nøddeskellet 8, 2730 Herlev')

      expect(response.headers.get('Content-Disposition')).toBe(
        'attachment; filename="calendar-N_ddeskellet_8__2730_Herlev.ics"'
      )
    })

    test('should sanitize special characters in filename', () => {
      const response = generateCalendarResponse(
        sampleICalContent,
        'Test/Address\\With:Special*Characters?'
      )

      expect(response.headers.get('Content-Disposition')).toBe(
        'attachment; filename="calendar-Test_Address_With_Special_Characters_.ics"'
      )
    })

    test('should include correct headers for calendar download', () => {
      const response = generateCalendarResponse(sampleICalContent)

      expect(response.headers.get('Pragma')).toBe('no-cache')
      expect(response.headers.get('Expires')).toBe('0')
    })
  })

  describe('Calendar filtering', () => {
    test('should call getEventsByAddress when address is provided', async () => {
      const filteredEvents = [mockEvents[0]]
      vi.mocked(getEventsByAddress).mockResolvedValue(filteredEvents)

      await generateICalendar(mockEnv, 'Nøddeskellet 8')

      expect(getEventsByAddress).toHaveBeenCalledWith(mockEnv.DB, 'Nøddeskellet 8')
      expect(getAllEvents).not.toHaveBeenCalled()
    })

    test('should call getAllEvents when no address is provided', async () => {
      vi.mocked(getAllEvents).mockResolvedValue(mockEvents)

      await generateICalendar(mockEnv)

      expect(getAllEvents).toHaveBeenCalledWith(mockEnv.DB)
      expect(getEventsByAddress).not.toHaveBeenCalled()
    })
  })
})
