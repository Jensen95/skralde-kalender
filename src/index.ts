/// <reference types="@cloudflare/workers-types" />

import { fromHono } from 'chanfana'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { csrf } from 'hono/csrf'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'

import type { Env } from './types'

import { generateCalendarResponse, generateICalendar } from './calendar'
import { deleteEvent, getAllEvents, initializeDatabase, storeEvent } from './database'
import { EmailEventParser, parseEmailMessage } from './email'

// Create new Hono app
const app = new Hono()

app.use('*', requestId())
app.use(
  '*',
  cors({
    allowHeaders: ['Content-Type'],
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    origin: '*',
  })
)
app.use(csrf())
app.use(secureHeaders())

// Initialize database middleware
app.use('*', async (c, next) => {
  const env = c.env as unknown as Env
  if (env?.DB) {
    await initializeDatabase(env.DB)
  }
  await next()
})

// Create the chanfana router
const openapi = fromHono(app, {
  docs_url: '/docs',
  openapi_url: '/openapi.json',
  schema: {
    info: {
      description: 'Cloudflare Worker for email-to-calendar conversion with OpenAPI documentation',
      title: 'Ice Calendar Worker API',
      version: '1.0.0',
    },
    servers: [
      {
        description: 'Production server',
        url: 'https://your-worker.your-subdomain.workers.dev',
      },
    ],
  },
})

// Calendar routes
openapi.get('/calendar', async (c) => {
  const address = c.req.query('address')
  const icalContent = await generateICalendar(c.env as unknown as Env, address)
  return generateCalendarResponse(icalContent, address)
})

openapi.get('/calendar.ics', async (c) => {
  const address = c.req.query('address')
  const icalContent = await generateICalendar(c.env as unknown as Env, address)
  return generateCalendarResponse(icalContent, address)
})

openapi.get('/calendar/:address.ics', async (c) => {
  const address = decodeURIComponent(c.req.param('address'))
  const icalContent = await generateICalendar(c.env as unknown as Env, address)
  return generateCalendarResponse(icalContent, address)
})

// Events API routes
openapi.get('/events', async (c) => {
  try {
    const events = await getAllEvents((c.env as unknown as Env).DB)
    return c.json(events)
  } catch (error) {
    console.error('Get events error:', error)
    return c.json({ error: 'Error fetching events' }, 500)
  }
})

openapi.delete('/events', async (c) => {
  try {
    const eventId = c.req.query('id')

    if (!eventId) {
      return c.json({ error: 'Event ID required' }, 400)
    }

    const success = await deleteEvent((c.env as unknown as Env).DB, eventId)

    return success ? c.json({ success: true }) : c.json({ error: 'Event not found' }, 404)
  } catch (error) {
    console.error('Delete event error:', error)
    return c.json({ error: 'Error deleting event' }, 500)
  }
})

// Root route
openapi.get('/', (c) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ice Calendar Worker</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 2rem;
        }
        .card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 1.5rem;
            margin: 1rem 0;
            border-left: 4px solid #007bff;
        }
        .endpoint {
            font-family: monospace;
            background: #e9ecef;
            padding: 0.5rem;
            border-radius: 4px;
            margin: 0.5rem 0;
        }
        .button {
            display: inline-block;
            background: #007bff;
            color: white;
            padding: 0.75rem 1.5rem;
            text-decoration: none;
            border-radius: 4px;
            margin: 0.5rem 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧊 Ice Calendar Worker</h1>
        <p>Cloudflare Worker for email-to-calendar conversion</p>
    </div>
    
    <div class="card">
        <h2>📅 Calendar Access</h2>
        <p>Subscribe to your calendar using this URL:</p>
        <div class="endpoint">${c.req.url}/calendar.ics</div>
        <a href="/calendar.ics" class="button">Download Calendar</a>
    </div>
    
    <div class="card">
        <h2>📧 Email Setup</h2>
        <p>Forward emails to your configured address to automatically add events.</p>
        <p>The system will parse common date/time patterns and create calendar events.</p>
    </div>
    
    <div class="card">
        <h2>🔧 API Documentation</h2>
        <p>Explore the API endpoints with interactive documentation:</p>
        <a href="/docs" class="button">View API Docs</a>
        <div class="endpoint">GET /docs - Interactive API documentation</div>
        <div class="endpoint">GET /openapi.json - OpenAPI schema</div>
    </div>
    
    <div class="card">
        <h2>📋 API Endpoints</h2>
        <div class="endpoint">GET /calendar.ics - Download iCalendar file</div>
        <div class="endpoint">GET /events - List all events (JSON)</div>
        <div class="endpoint">DELETE /events?id=EVENT_ID - Delete an event</div>
    </div>
</body>
</html>`

  return c.html(html)
})

// Export the Hono app
export default {
  async email(message: ForwardableEmailMessage, env: Env, _ctx: ExecutionContext): Promise<void> {
    try {
      console.log('Processing email:', message.headers.get('subject'))

      // Parse the email message
      const emailMessage = await parseEmailMessage(message.raw)

      // Extract events from the email
      const parser = new EmailEventParser()
      const events = await parser.extractEvents(emailMessage)

      console.log(`Extracted ${events.length} events from email`)

      // Store the events
      for (const event of events) {
        await storeEvent(env.DB, event)
        console.log(`Stored event: ${event.title} at ${event.start}`)
      }
    } catch (error) {
      console.error('Email processing error:', error)
    }
  },

  fetch: app.fetch,
}
