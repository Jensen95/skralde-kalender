# Setup Guide

This guide walks you through setting up the Ice Calendar Worker from scratch.

## Prerequisites

- Cloudflare account with Workers plan
- Domain managed by Cloudflare (for email routing)
- Node.js 18+ and npm installed

## Step 1: Clone and Install

```bash
git clone <your-repo>
cd ice-calendar-worker
npm install
```

## Step 2: Cloudflare Configuration

### 2.1 Install Wrangler

```bash
npm install -g wrangler
wrangler login
```

### 2.2 Create D1 Database

```bash
# Create D1 database
wrangler d1 create ice-calendar-db
```

Copy the database ID from the output and update `wrangler.toml`.

### 2.3 Update wrangler.toml

```toml
name = "your-calendar-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "ice-calendar-db"
database_id = "paste-your-d1-database-id-here"

[vars]
CALENDAR_NAME = "Your Calendar Name"
CALENDAR_DESCRIPTION = "Calendar populated from email forwards"
```

## Step 3: Email Routing Setup

### 3.1 Enable Email Routing

1. Go to Cloudflare Dashboard
2. Select your domain
3. Go to **Email > Email Routing**
4. Click **Enable Email Routing**
5. Follow the DNS setup instructions

### 3.2 Create Email Rule

1. In Email Routing, go to **Routes**
2. Click **Create address**
3. Set up forwarding:
   - **Address**: `calendar@yourdomain.com`
   - **Action**: Send to Worker
   - **Worker**: Your worker name

## Step 4: Deploy

```bash
# Test locally first
npm run dev

# Deploy to Cloudflare
npm run deploy
```

## Step 5: Test the Setup

### 5.1 Access the Worker

Visit: `https://your-worker.your-subdomain.workers.dev`

You should see the calendar dashboard.

### 5.2 Test Email Processing

Send an email to `calendar@yourdomain.com` with content like:

```
Subject: Team Meeting

Meeting scheduled for January 15, 2024 at 2:00 PM
Location: Conference Room A
```

### 5.3 Check Calendar

Visit: `https://your-worker.your-subdomain.workers.dev/calendar.ics`

The event should appear in the calendar file.

## Step 6: Subscribe to Calendar

Add this URL to your calendar app:
```
https://your-worker.your-subdomain.workers.dev/calendar.ics
```

**Calendar Apps:**
- **Google Calendar**: Settings > Add calendar > From URL
- **Apple Calendar**: File > New Calendar Subscription
- **Outlook**: Add calendar > Subscribe from web

## Troubleshooting

### Email Not Working

1. **Check DNS Records**: Ensure MX records are configured
2. **Verify Email Routing**: Check status in Cloudflare Dashboard
3. **Worker Logs**: Run `wrangler tail` to see real-time logs
4. **Test Email**: Use Cloudflare's email testing tool

### Calendar Not Updating

1. **Cache**: Calendar apps cache ICS files (wait 15-30 minutes)
2. **Force Refresh**: Most apps have a refresh option
3. **Check Events**: Visit `/events` endpoint to see stored events
4. **D1 Database**: Use `wrangler d1 execute ice-calendar-db --command "SELECT * FROM calendar_events LIMIT 10;"`

### Development Issues

1. **Type Errors**: Run `npm run type-check`
2. **Dependencies**: Ensure all packages are installed
3. **Worker Limits**: Check Cloudflare Worker limits for your plan

## Advanced Configuration

### Custom Date Parsing

Edit `src/email.ts` to add custom date patterns:

```typescript
const datePatterns = [
  // Add your custom regex patterns
  /your-custom-pattern/gi,
];
```

### Event Filtering

Modify the email parser to filter out unwanted events or add custom logic.

### Multiple Calendars

Create separate workers for different types of events or use event categories.

## Security Considerations

- **Email Validation**: The worker processes all emails sent to the configured address
- **Rate Limiting**: Consider implementing rate limiting for public endpoints
- **Access Control**: Calendar endpoints are public by default
- **Data Storage**: Events are stored in Cloudflare KV (encrypted at rest)

## Monitoring

- **Worker Analytics**: Available in Cloudflare Dashboard
- **Real-time Logs**: `wrangler tail`
- **KV Usage**: Monitor in Cloudflare Dashboard
- **Email Processing**: Check Email Routing analytics