# 🧊 Ice Calendar Worker

A Cloudflare Worker that serves an iCalendar (ICS) file populated by incoming email forwards. Built with TypeScript.

## Features

- 📅 **iCalendar Server**: Serves RFC 5545 compliant iCalendar files
- 📧 **Email Processing**: Automatically extracts events from forwarded emails
- ☁️ **Cloudflare Integration**: Uses Cloudflare D1 database for storage and email routing
- 🔍 **Smart Parsing**: Recognizes common date/time patterns in emails including Danish formats
- 🗑️ **Waste Collection Support**: Special handling for Danish waste collection emails
- 🎨 **Web Interface**: Simple web UI for calendar management
- 🔗 **REST API**: JSON API for event management

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Wrangler

Update `wrangler.toml` with your settings:

```toml
# Replace with your worker name
name = "your-ice-calendar-worker"

# Create KV namespace and update IDs
[[kv_namespaces]]
binding = "CALENDAR_EVENTS"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"

# Update email routing
[[email]]
name = "calendar-email"
destination_address = "calendar@yourdomain.com"
```

### 3. Create KV Namespace

```bash
npx wrangler kv:namespace create "CALENDAR_EVENTS"
npx wrangler kv:namespace create "CALENDAR_EVENTS" --preview
```

### 4. Deploy

```bash
npm run deploy
```

## Email Setup

1. **Configure Email Routing** in Cloudflare Dashboard:
   - Go to Email > Email Routing
   - Add your domain
   - Create a forwarding rule to your worker

2. **Email Patterns Recognized**:
   - `January 15, 2024 at 3:00 PM`
   - `2024-01-15 15:00`
   - `01/15/2024 3:00 PM`
   - `Monday, January 15th at 3 PM`
   - `mandag d.07-07-2025` (Danish format)
   - `d.07-07-2025` (Danish short format)

3. **Location Detection**:
   - `Location: Conference Room A`
   - `Where: Zoom meeting`
   - `at 123 Main Street`
   - `adressen Eksempelvej 1, 1234 Bynavn` (Danish address format)

4. **Danish Waste Collection Types**:
   - `storskrald` (Bulky waste)
   - `glas/metal` (Glass/metal)
   - `papir` (Paper)
   - `restaffald` (Residual waste)
   - `madaffald` (Food waste)
   - `genbrugsplast` (Recycling plastic)

## API Endpoints

### Calendar Access
- `GET /calendar.ics` - Download iCalendar file
- `GET /calendar` - Same as above

### Event Management
- `GET /events` - List all events (JSON)
- `DELETE /events?id=EVENT_ID` - Delete an event

### Web Interface
- `GET /` - Calendar management dashboard

## Calendar Subscription

### All Events
Add this URL to your calendar app:
```
https://your-worker.your-subdomain.workers.dev/calendar.ics
```

### Address-Specific Events
Subscribe to events for a specific address:
```
https://your-worker.your-subdomain.workers.dev/calendar.ics?address=Eksempelvej%201
```
Or use path-based format:
```
https://your-worker.your-subdomain.workers.dev/calendar/Eksempelvej%201.ics
```

**Supported Calendar Apps**:
- Google Calendar
- Apple Calendar
- Outlook
- Thunderbird
- Any RFC 5545 compliant calendar

## Development

```bash
# Start development server
npm run dev

# Type checking
npm run type-check

# Build
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Email Processing Logic

The worker automatically:

1. **Receives** forwarded emails via Cloudflare Email Routing
2. **Parses** email content for date/time patterns
3. **Extracts** event information (title, location, description)
4. **Stores** events in Cloudflare KV
5. **Serves** updated calendar via iCalendar format

## Example Email Formats

### Meeting Invitation
```
Subject: Team Meeting Tomorrow

Hi everyone,

We have a team meeting scheduled for January 15, 2024 at 2:00 PM
Location: Conference Room B

Please bring your laptops.
```

### Event Announcement
```
Subject: Company Holiday Party

Join us for our annual holiday party!
Date: Friday, December 22nd at 6:00 PM
Where: The Grand Ballroom, 456 Oak Street

Food and drinks will be provided.
```

### Danish Waste Collection Email
```
Subject: Affaldsafhentning - Storskrald

Kære [Navn på modtager].

Du vil mandag d.07-07-2025 få afhentet storskrald på adressen [Eksempelvej 1, 1234 Bynavn].
Afmeld/rediger din tilmelding her: Servicen kan ændres/afmeldes på her
Dette er en automatisk afsendt e-mail, som ikke kan besvares.
```

## Configuration

### Environment Variables
- `CALENDAR_NAME` - Name of your calendar
- `CALENDAR_DESCRIPTION` - Calendar description

### Storage
- Uses Cloudflare D1 database for event storage
- Events are stored with SQL schema and indexes
- Supports advanced querying and filtering
- Address-specific calendar subscriptions
- Automatic deduplication by event ID

### Testing
- Comprehensive test suite with vitest
- Email parsing tests for Danish and English formats
- Calendar generation and iCal format tests
- Database operation tests with mocking
- 44 test cases covering edge cases

## Security

- CORS enabled for calendar access
- No authentication required for calendar subscription
- Email processing is internal to Cloudflare
- Event IDs are generated with timestamp + random string

## Troubleshooting

### Email Not Processing
1. Check Email Routing configuration in Cloudflare Dashboard
2. Verify worker email handler is deployed
3. Check worker logs: `npx wrangler tail`

### Calendar Not Updating
1. Calendar apps may cache ICS files (wait 15-30 minutes)
2. Force refresh in your calendar app
3. Check KV storage: `npx wrangler kv:key list --binding=CALENDAR_EVENTS`

### Date Parsing Issues
- Ensure dates include year
- Use common formats (see examples above)
- Time zones default to UTC

## License

MIT License - see LICENSE file for details. 
