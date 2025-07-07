import { describe, expect } from 'vitest'

import type { EmailMessage } from './types'

import { EmailEventParser } from './email'

describe('EmailEventParser', () => {
  const parser = new EmailEventParser()

  // Helper function to create mock email messages
  const createMockEmail = (
    subject: string,
    content: string,
    from = 'test@example.com'
  ): EmailMessage => ({
    from,
    to: 'calendar@example.com',
    subject,
    content,
    headers: new Map(),
    raw: new ArrayBuffer(0),
  })

  describe('Danish waste collection emails', () => {
    it('should parse storskrald collection email', async () => {
      const email = createMockEmail(
        'Affaldsafhentning',
        'Kære Morten Hartvig Jensen.\n\nDu vil mandag d.07-07-2025 få afhentet storskrald på adressen Nøddeskellet 8, 2730 Herlev.'
      )

      const events = await parser.extractEvents(email)

      expect(events).toHaveLength(1)
      expect(events[0].title).toBe('Storskrald afhentning')
      expect(events[0].start.getFullYear()).toBe(2025)
      expect(events[0].start.getMonth()).toBe(6) // July (0-indexed)
      expect(events[0].start.getDate()).toBe(7)
      expect(events[0].start.getHours()).toBe(7) // 07:00
      expect(events[0].location).toBe('Nøddeskellet 8, 2730 Herlev')
      expect((events[0] as any).eventType).toBe('storskrald')
    })

    it('should parse glas/metal collection email', async () => {
      const email = createMockEmail(
        'Glas/metal afhentning',
        'Du vil mandag d.15-08-2025 få tømt glas/metal på adressen Nøddeskellet 8, 2730 Herlev.'
      )

      const events = await parser.extractEvents(email)

      expect(events).toHaveLength(1)
      expect(events[0].title).toBe('Glas/metal afhentning')
      expect(events[0].start.getFullYear()).toBe(2025)
      expect(events[0].start.getMonth()).toBe(7) // August (0-indexed)
      expect(events[0].start.getDate()).toBe(15)
      expect(events[0].location).toBe('Nøddeskellet 8, 2730 Herlev')
      expect((events[0] as any).eventType).toBe('glas_metal')
    })

    it('should parse short Danish date format', async () => {
      const email = createMockEmail(
        'Papir afhentning',
        'Afhentning d.01-12-2025 på adressen Testvej 123, 1234 København.'
      )

      const events = await parser.extractEvents(email)

      expect(events).toHaveLength(1)
      expect(events[0].start.getFullYear()).toBe(2025)
      expect(events[0].start.getMonth()).toBe(11) // December (0-indexed)
      expect(events[0].start.getDate()).toBe(1)
      expect(events[0].start.getHours()).toBe(7) // Default to 07:00
    })

    it('should handle multiple waste types', async () => {
      const wasteTypes = [
        { text: 'storskrald', expected: 'storskrald', title: 'Storskrald afhentning' },
        { text: 'glas/metal', expected: 'glas_metal', title: 'Glas/metal afhentning' },
        { text: 'papir', expected: 'papir', title: 'Papir afhentning' },
        { text: 'restaffald', expected: 'restaffald', title: 'Restaffald afhentning' },
        { text: 'madaffald', expected: 'madaffald', title: 'Madaffald afhentning' },
        { text: 'genbrugsplast', expected: 'genbrugsplast', title: 'Genbrugsplast afhentning' },
      ]

      for (const wasteType of wasteTypes) {
        const email = createMockEmail(
          'Affaldsafhentning',
          `Du vil mandag d.07-07-2025 få afhentet ${wasteType.text} på adressen Testvej 1, 1234 København.`
        )

        const events = await parser.extractEvents(email)

        expect(events).toHaveLength(1)
        expect(events[0].title).toBe(wasteType.title)
        expect((events[0] as any).eventType).toBe(wasteType.expected)
      }
    })

    it('should parse pap (cardboard) collection email', async () => {
      const email = createMockEmail(
        'Pap afhentning',
        'Du vil mandag d.10-07-2025 få afhentet pap på adressen Nøddeskellet 8, 2730 Herlev.'
      )

      const events = await parser.extractEvents(email)

      expect(events).toHaveLength(1)
      expect(events[0].title).toBe('Pap afhentning')
      expect(events[0].start.getFullYear()).toBe(2025)
      expect(events[0].start.getMonth()).toBe(6) // July (0-indexed)
      expect(events[0].start.getDate()).toBe(10)
      expect(events[0].location).toBe('Nøddeskellet 8, 2730 Herlev')
      expect((events[0] as any).eventType).toBe('pap')
    })
  })

  describe('Address parsing', () => {
    it('should extract Danish addresses with "adressen"', async () => {
      const email = createMockEmail(
        'Test event',
        'Event d.01-01-2025 på adressen Nøddeskellet 8, 2730 Herlev.'
      )

      const events = await parser.extractEvents(email)

      expect(events).toHaveLength(1)
      expect(events[0].location).toBe('Nøddeskellet 8, 2730 Herlev')
    })

    it('should handle addresses with special characters', async () => {
      const email = createMockEmail(
        'Test event',
        'Event d.01-01-2025 på adressen Åbrinken 42, 2765 Smørum.'
      )

      const events = await parser.extractEvents(email)

      expect(events).toHaveLength(1)
      expect(events[0].location).toBe('Åbrinken 42, 2765 Smørum')
    })
  })

  describe('General date parsing', () => {
    it('should parse English date formats', async () => {
      const email = createMockEmail(
        'Meeting',
        'Meeting scheduled for January 15, 2025 at 2:00 PM in Conference Room A.'
      )

      const events = await parser.extractEvents(email)

      expect(events).toHaveLength(1)
      expect(events[0].title).toBe('Meeting')
      expect(events[0].start.getFullYear()).toBe(2025)
      expect(events[0].start.getMonth()).toBe(0) // January
      expect(events[0].start.getDate()).toBe(15)
    })

    it('should handle ISO date format', async () => {
      const email = createMockEmail('Event', 'Event on 2025-03-20 14:30')

      const events = await parser.extractEvents(email)

      expect(events).toHaveLength(1)
      expect(events[0].start.getFullYear()).toBe(2025)
      expect(events[0].start.getMonth()).toBe(2) // March
      expect(events[0].start.getDate()).toBe(20)
    })
  })

  describe('Edge cases', () => {
    it('should handle emails with no dates', async () => {
      const email = createMockEmail('No date email', 'This email has no date information.')

      const events = await parser.extractEvents(email)

      expect(events).toHaveLength(0)
    })

    it('should handle empty email content', async () => {
      const email = createMockEmail('', '')

      const events = await parser.extractEvents(email)

      expect(events).toHaveLength(0)
    })

    it('should handle malformed Danish dates', async () => {
      const email = createMockEmail('Bad date', 'Event d.32-13-2025 should not parse.')

      const events = await parser.extractEvents(email)

      expect(events).toHaveLength(0)
    })

    it('should clean email subject for title', async () => {
      const email = createMockEmail('RE: FW: Meeting Tomorrow', 'Meeting d.01-01-2025')

      const events = await parser.extractEvents(email)

      expect(events).toHaveLength(1)
      expect(events[0].title).toBe('Meeting Tomorrow')
    })
  })

  describe('Event duration and end times', () => {
    it('should set default 1-hour duration', async () => {
      const email = createMockEmail('Event', 'Event d.01-01-2025')

      const events = await parser.extractEvents(email)

      expect(events).toHaveLength(1)
      const duration = events[0].end.getTime() - events[0].start.getTime()
      expect(duration).toBe(60 * 60 * 1000) // 1 hour in milliseconds
    })

    it('should handle events with 07:00 start time', async () => {
      const email = createMockEmail('Early event', 'Event d.01-01-2025')

      const events = await parser.extractEvents(email)

      expect(events).toHaveLength(1)
      expect(events[0].start.getHours()).toBe(7)
      expect(events[0].start.getMinutes()).toBe(0)
      expect(events[0].end.getHours()).toBe(8)
      expect(events[0].end.getMinutes()).toBe(0)
    })
  })
})
