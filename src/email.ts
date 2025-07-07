import PostalMime from 'postal-mime'

import type { CalendarEvent, EmailMessage, EmailParser } from './types'

import { generateEventId } from './database'

export class EmailEventParser implements EmailParser {
  async extractEvents(email: EmailMessage): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = []

    // Parse the email content to look for date/time patterns and event information
    const eventInfo = this.extractEventInfo(email.subject, email.content)

    if (eventInfo.length > 0) {
      for (const info of eventInfo) {
        const event: CalendarEvent = {
          attendees: [email.to],
          created: new Date(),
          description: info.description,
          end: info.end,
          id: generateEventId(),
          location: info.location,
          modified: new Date(),
          organizer: email.from,
          start: info.start,
          title: info.title,
        }

        // Add extended properties for database storage
        ;(event as unknown as { eventType: string }).eventType = info.eventType
        ;(event as unknown as { sourceEmail: string }).sourceEmail =
          `${email.subject}\n\n${email.content.slice(0, 500)}`

        events.push(event)
      }
    }

    return events
  }

  private extractEventInfo(
    subject: string,
    content: string
  ): Array<{
    description: string
    end: Date
    eventType: string
    location?: string
    start: Date
    title: string
  }> {
    const events: Array<{
      description: string
      end: Date
      eventType: string
      location?: string
      start: Date
      title: string
    }> = []

    // Look for Danish waste collection patterns and common date patterns
    const datePatterns = [
      // Danish format: "mandag d.07-07-2025" or similar (most specific first)
      /(?:mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag)\s+d\.(\d{2}-\d{2}-\d{4})/gi,
      // Alternative Danish format: "d. 07-07-2025" or "d.07-07-2025" (less specific)
      /\bd\.?\s*(\d{2}-\d{2}-\d{4})\b/gi,
      // Match patterns like "January 15, 2024 at 3:00 PM" or "January 15, 2025 at 2:00 PM"
      /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}(?:\s+at\s+\d{1,2}:\d{2}\s*(?:am|pm))?/gi,
      // Match patterns like "2024-01-15 15:00" or "01/15/2024 3:00 PM"
      /\d{4}(?:-\d{2}){2}\s+\d{1,2}:\d{2}|(?:\d{1,2}\/){2}\d{4}\s+\d{1,2}:\d{2}\s*(?:am|pm)?/gi,
      // Match patterns like "Monday, January 15th at 3 PM"
      /(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)?/gi,
    ]

    const fullText = `${subject} ${content}`

    // Extract dates from the text
    const foundDates: Date[] = []
    const processedMatches = new Set<string>() // Prevent duplicates

    for (const pattern of datePatterns) {
      const matches = fullText.match(pattern)
      if (matches) {
        for (const match of matches) {
          // Skip if we've already processed this match
          if (processedMatches.has(match)) {
            continue
          }
          processedMatches.add(match)

          const date = this.parseDate(match)
          if (date) {
            // Check if we already have this date (prevent duplicates)
            const dateKey = date.toISOString()
            if (!foundDates.some((existing) => existing.toISOString() === dateKey)) {
              foundDates.push(date)
            }
          }
        }
      }
    }

    // If we found dates, create events
    if (foundDates.length > 0) {
      // Extract event type and create appropriate title
      const eventType = this.extractWasteCollectionType(fullText)
      const title = this.createEventTitle(subject, eventType)

      // Look for location keywords (including Danish addresses)
      const location = this.extractLocation(fullText)

      for (const startDate of foundDates) {
        // Default duration is 1 hour
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)

        events.push({
          description: this.truncateText(content, 200),
          end: endDate,
          eventType,
          location,
          start: startDate,
          title,
        })
      }
    }

    return events
  }

  private parseDate(dateString: string): Date | null {
    try {
      // Handle Danish date format: "d.07-07-2025" or "mandag d.07-07-2025"
      const danishMatch = dateString.match(/(\d{2}-\d{2}-\d{4})/)
      if (danishMatch) {
        const [day, month, year] = danishMatch[1].split('-')
        // Default time to 07:00 (7:00 AM) for waste collection
        const date = new Date(`${year}-${month}-${day}T07:00:00`)
        if (!Number.isNaN(date.getTime())) {
          return date
        }
      }

      // Handle English date formats with "at" - convert to standard format
      const normalizedDate = dateString
        .replace(/\s+at\s+/i, ' ') // Remove "at"
        .replace(/(\d{1,2}):(\d{2})\s*(am|pm)/i, (match, hours, minutes, ampm) => {
          let hour = Number.parseInt(hours)
          if (ampm.toUpperCase() === 'PM' && hour !== 12) hour += 12
          if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0
          return `${hour.toString().padStart(2, '0')}:${minutes}:00`
        })

      // Try to parse the normalized date string
      const date = new Date(normalizedDate)
      if (Number.isNaN(date.getTime())) {
        return null
      }
      return date
    } catch {
      return null
    }
  }

  private extractWasteCollectionType(text: string): string {
    const wasteTypes = {
      genbrugsplast: 'genbrugsplast',
      'glas/metal': 'glas_metal',
      madaffald: 'madaffald',
      pap: 'pap',
      papir: 'papir',
      restaffald: 'restaffald',
      storskrald: 'storskrald',
    }

    for (const [pattern, type] of Object.entries(wasteTypes)) {
      if (text.toLowerCase().includes(pattern)) {
        return type
      }
    }

    return 'general'
  }

  private createEventTitle(subject: string, eventType: string): string {
    const wasteTypeNames = {
      genbrugsplast: 'Genbrugsplast afhentning',
      general: this.cleanEventTitle(subject),
      glas_metal: 'Glas/metal afhentning',
      madaffald: 'Madaffald afhentning',
      pap: 'Pap afhentning',
      papir: 'Papir afhentning',
      restaffald: 'Restaffald afhentning',
      storskrald: 'Storskrald afhentning',
    }

    return wasteTypeNames[eventType as keyof typeof wasteTypeNames] || this.cleanEventTitle(subject)
  }

  private cleanEventTitle(subject: string): string {
    // Remove common email prefixes (including RE:, FW:, FWD:) - may be multiple
    let cleaned = subject
    while (/^(re:|fw:|fwd:)\s*/i.test(cleaned)) {
      cleaned = cleaned.replace(/^(re:|fw:|fwd:)\s*/i, '')
    }
    return cleaned.replace(/\s+/g, ' ').trim()
  }

  private extractLocation(text: string): string | undefined {
    // Look for Danish address patterns first
    const danishAddressPattern = /adressen\s+([^\n.]+)/gi
    const danishMatch = text.match(danishAddressPattern)
    if (danishMatch && danishMatch[0]) {
      // Extract everything after "adressen" until line end
      const addressPart = danishMatch[0].replace(/adressen\s+/gi, '').trim()
      // Remove any trailing punctuation
      return addressPart.replace(/\.$/, '')
    }

    // Look for common location patterns
    const locationPatterns = [
      /(?:at|@)\s+([^\n,.]+(?:room|office|building|street|avenue|drive|road|conference|zoom|teams|meet))/gi,
      /location:\s*([^\n,]+)/gi,
      /where:\s*([^\n,]+)/gi,
    ]

    for (const pattern of locationPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }

    return undefined
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text
    }
    return `${text.slice(0, Math.max(0, maxLength))}...`
  }
}

export const parseEmailMessage = async (raw: ReadableStream<Uint8Array>): Promise<EmailMessage> => {
  // PostalMime can handle ReadableStream directly in Cloudflare Workers
  const parsed = await PostalMime.parse(raw)
  // Convert headers to Map<string, string>
  const headers = new Map<string, string>()
  if (parsed.headers) {
    for (const header of parsed.headers) {
      headers.set(header.key, header.value)
    }
  }

  return {
    content: parsed.text || parsed.html || '',
    from: parsed.from?.address || '',
    headers,
    raw: new ArrayBuffer(0), // We don't need to store the raw data
    subject: parsed.subject || '',
    to: parsed.to?.[0]?.address || '',
  }
}
