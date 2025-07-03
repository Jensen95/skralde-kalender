/// <reference types="@cloudflare/workers-types" />

export interface CalendarEvent {
  attendees?: string[]
  created: Date
  description?: string
  end: Date
  id: string
  location?: string
  modified: Date
  organizer?: string
  start: Date
  title: string
}

export interface EmailEventExtraction {
  body: string
  date: Date
  events: CalendarEvent[]
  from: string
  subject: string
  to: string
}

export interface Env {
  CALENDAR_DESCRIPTION: string
  CALENDAR_NAME: string
  DB: D1Database
}

export interface EmailMessage {
  content: string
  from: string
  headers: Map<string, string>
  raw: ArrayBuffer
  subject: string
  to: string
}

export interface ParsedEmailDate {
  date?: Date
  duration?: number // in minutes
  time?: string
}

export interface EmailParser {
  extractEvents(email: EmailMessage): Promise<CalendarEvent[]>
}

export const EVENT_STATUS = {
  CANCELLED: 'CANCELLED',
  CONFIRMED: 'CONFIRMED',
  TENTATIVE: 'TENTATIVE',
} as const

export type EventStatus = (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS]
