# FinCart Appointment Booking API

A RESTful API built with NestJS, PostgreSQL, and Prisma that allows service providers (e.g., doctors) to offer available time slots and users to book these appointments.

## Features

- Authentication with JWT
  - User and Provider signup/login
- Time Slot Management
  - Providers can create/edit/delete time slots
  - Users can view available slots filtered by provider
- Appointment Booking
  - Users can book available slots
  - Users can cancel their bookings
  - Providers can view all their slots and check which are booked
- Automated Tasks
  - Email reminders 30 minutes before appointments
  - Auto-marking of past appointments as completed

## Tech Stack

- NestJS - A progressive Node.js framework
- PostgreSQL - Advanced open-source database
- Prisma - Next-generation ORM
- Passport.js with JWT - Authentication
- Class Validator & Class Transformer - DTO validation
- Node-cron - Scheduling background tasks
- Nodemailer - Sending email notifications
- Docker - Containerization

## Setup

### Prerequisites

- Node.js (v14+)
- npm or yarn
- PostgreSQL database
- Docker and Docker Compose (optional, for containerized setup)

### Installation

#### Local Setup

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd fincart-appointment-api
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   Create a `.env` file with the following variables:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/fincart_appointments?schema=public"
   JWT_SECRET="your-secret-key-here"
   JWT_EXPIRES_IN="1d"
   PORT=3000
   NODE_ENV=development
   
   # Email settings (for appointment reminders)
   MAIL_HOST="smtp.example.com"
   MAIL_PORT=587
   MAIL_USER="user@example.com"
   MAIL_PASSWORD="your-password"
   MAIL_FROM="noreply@example.com"
   ```

4. Initialize the database
   ```bash
   npx prisma migrate dev
   ```

5. Start the application
   ```bash
   # development
   npm run start:dev
   
   # production
   npm run build
   npm run start:prod
   ```

#### Docker Setup

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd fincart-appointment-api
   ```

2. Using Docker Compose directly:

   Development Environment
   ```bash
   # Start the application in development mode
   docker-compose -f docker-compose.dev.yml up -d
   ```

   Production Environment
   ```bash
   # Build and start the application in production mode
   docker-compose up -d
   ```

3. Using the provided Makefile (easier):

   ```bash
   # Start development environment
   make dev

   # Start production environment
   make prod

   # Stop all containers
   make down

   # View logs in development
   make logs-dev

   # View logs in production
   make logs-prod

   # Run migrations in development
   make migrate-dev

   # Run migrations in production
   make migrate-prod
   ```

## API Documentation

Once the application is running, you can view the Swagger documentation at:
```
http://localhost:3000/docs
```

## API Endpoints

### Auth
- POST `/api/auth/signup` - Register a new user or provider
- POST `/api/auth/login` - Login and get JWT token

### Time Slots
- GET `/api/time-slots` - Get all time slots (with optional filters)
- GET `/api/time-slots/:id` - Get a specific time slot
- GET `/api/time-slots/provider` - Get provider's time slots (for providers only)
- POST `/api/time-slots` - Create a new time slot (providers only)
- PATCH `/api/time-slots/:id` - Update a time slot (providers only)
- DELETE `/api/time-slots/:id` - Delete a time slot (providers only)

### Bookings
- GET `/api/bookings` - Get user's bookings
- GET `/api/bookings/:id` - Get a specific booking
- POST `/api/bookings` - Book a time slot
- PATCH `/api/bookings/:id` - Update booking status
- DELETE `/api/bookings/:id` - Cancel a booking

## Testing

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## License

This project is licensed under the MIT License.
# appointment
