# PRESCRIPTO+ PRODUCT REQUIREMENTS DOCUMENT

---

## 1. Product Overview

**Product Name:** Prescripto+  
**Current Version:** v1.5 in active development  
**Type:** Full-stack MERN application  
**Primary Goal:** Let patients discover verified doctors, book time-based appointments, and manage their care journey through a web platform.

Prescripto+ has moved beyond the original MVP draft. The backend now supports authentication, doctor profile management, doctor verification, slot-based booking, appointment lifecycle actions, and password/email flows. The frontend is in the UI integration stage, with auth screens and route structure in place and doctor/appointment pages scaffolded.

---

## 2. Problem Statement

Patients and clinics commonly face:

- Difficulty finding relevant doctors quickly
- Manual, error-prone appointment booking
- No simple patient-facing view of appointment status
- Poor visibility into doctor time-slot availability
- Fragmented account and password recovery flows

Prescripto+ solves this by providing a centralized booking experience with role-based access and controlled appointment workflows.

---

## 3. Current Project Status

### Backend Status

Implemented and working:

- Email/password authentication
- JWT access and refresh token flow using cookies
- Email verification flow
- Forgot password and reset password flow
- Current-user session endpoint
- Doctor profile creation and update
- Doctor verification by admin
- Doctor availability schedule management
- Doctor public listing with pagination and specialization filter
- Slot generation from configured doctor availability
- Appointment booking with double-booking protection
- Appointment listing for patient and doctor
- Appointment fetch by id with ownership checks
- Appointment cancel flow
- Appointment status update flow
- Appointment reschedule flow
- Admin seeding script

Known remaining backend work:

- Swagger / OpenAPI documentation
- Broader admin management endpoints
- Automated tests
- Lint cleanup outside the appointment/auth fixes
- Production hardening and deployment configuration

### Frontend Status

Implemented:

- Router structure
- Register page
- Login page
- Axios API setup with credentials
- Auth context base setup

Scaffolded but not fully integrated yet:

- Doctors page
- Doctor details page
- Appointments page
- Patient profile page

---

## 4. In-Scope User Roles

### Patient

- Register account
- Verify email
- Log in and refresh session
- Reset forgotten password
- View verified doctors
- View doctor details
- Check available slots
- Book appointment
- View own appointments
- Cancel appointment
- Reschedule appointment
- Change password

### Doctor

- Own a doctor profile linked to a user account
- Update profile details
- Toggle availability
- Define weekly slot availability
- View appointments assigned to them
- Update appointment status
- Cancel appointments when allowed

### Admin

- Log in as elevated role
- Verify doctor profiles
- Access protected admin-capable flows
- Reschedule or cancel appointments when needed

---

## 5. Core Product Requirements

### 5.1 Authentication and Account Security

Requirements:

- User can register with name, email, and password
- Passwords must be hashed before storage
- User cannot log in until email is verified
- User can request another verification email
- User can request password reset email
- User can reset password using a tokenized link
- Authenticated user can change password
- Session must support refresh-token flow
- Auth-protected endpoints must resolve the logged-in user from cookies

Current implementation status: Implemented

### 5.2 Doctor Discovery

Requirements:

- Patients can fetch verified and available doctors
- Doctor listing supports pagination
- Doctor listing supports specialization filtering
- Patients can fetch a doctor by id
- Doctor details should include linked user identity fields needed by frontend display

Current implementation status: Implemented on backend, frontend listing/details still pending full integration

### 5.3 Doctor Profile and Availability

Requirements:

- Authenticated user can create a doctor profile
- Doctor profile contains specialization, consultation fee, experience, qualifications, bio, and clinic address
- Admin can verify doctor profiles
- Doctor can maintain weekly availability by day
- Slot ranges must be validated for ordering, overlap, and duration
- Public booking must only use verified and available doctors

Current implementation status: Implemented

### 5.4 Appointment Booking

Requirements:

1. Patient selects a doctor
2. Patient fetches available slots for a date
3. Patient chooses a valid future slot
4. System prevents double booking for the same doctor and time
5. Appointment is created with initial status `pending`

Rules:

- Only patients can create appointments
- Appointment must be in the future
- Appointment must match doctor availability
- Cancelled slots become available again

Current implementation status: Implemented

### 5.5 Appointment Management

Requirements:

- Patient can fetch own appointments
- Doctor can fetch appointments assigned to them
- Patient, doctor, or admin can fetch appointment by id when authorized
- Doctor can change appointment status using controlled transitions
- Patient can cancel pending appointments
- Doctor can cancel non-completed appointments
- Admin can cancel appointments
- Patient or admin can reschedule active appointments to another valid slot
- Rescheduling resets status back to `pending`

Current implementation status: Implemented

### 5.6 Frontend Integration Requirements

Requirements:

- Frontend auth screens must connect to backend auth endpoints
- Frontend should persist cookie-based session using `withCredentials`
- Doctor pages should consume public doctor and slot endpoints
- Appointment pages should consume patient appointment endpoints
- Profile screen should consume current-user endpoint

Current implementation status: Partial

---

## 6. Data Model Requirements

### User

```js
{
  name: String,
  email: String,
  password: String,
  role: "patient" | "doctor" | "admin",
  avatar: String,
  isEmailVerified: Boolean,
  isActive: Boolean,
  refreshToken: String,
  forgotPasswordToken: String,
  forgotPasswordTokenExpiry: Date,
  emailVerificationToken: String,
  emailVerificationTokenExpiry: Date
}
```

### Doctor

```js
{
  user: ObjectId,
  specialization: String,
  experience: Number,
  consultationFee: Number,
  qualifications: [String],
  bio: String,
  clinicAddress: String,
  isVerified: Boolean,
  isAvailable: Boolean,
  rating: Number,
  slotDuration: Number,
  availability: [
    {
      day: String,
      slots: [
        {
          start: "HH:mm",
          end: "HH:mm"
        }
      ]
    }
  ]
}
```

### Appointment

```js
{
  patient: ObjectId,
  doctor: ObjectId,
  appointmentDateTime: Date,
  status: "pending" | "confirmed" | "cancelled" | "completed"
}
```

---

## 7. API Surface

### Health

- GET `/api/v1/healthCheck`

### Auth

- POST `/api/v1/auth/register`
- POST `/api/v1/auth/login`
- POST `/api/v1/auth/logout`
- POST `/api/v1/auth/refresh-token`
- GET `/api/v1/auth/me`
- GET `/api/v1/auth/verify-email/:token`
- POST `/api/v1/auth/resend-email-verification`
- POST `/api/v1/auth/forgot-password`
- POST `/api/v1/auth/reset-password/:token`
- POST `/api/v1/auth/change-password`

### Doctor

- POST `/api/v1/doctor`
- GET `/api/v1/doctor`
- GET `/api/v1/doctor/:id`
- PATCH `/api/v1/doctor`
- DELETE `/api/v1/doctor`
- PATCH `/api/v1/doctor/availability`
- PATCH `/api/v1/doctor/slot-availability`
- PATCH `/api/v1/doctor/verify/:id`

### Appointment

- GET `/api/v1/appointment/slots`
- POST `/api/v1/appointment`
- GET `/api/v1/appointment`
- GET `/api/v1/appointment/doctor`
- GET `/api/v1/appointment/:id`
- PATCH `/api/v1/appointment/:id/reschedule`
- PATCH `/api/v1/appointment/:id/status`
- PATCH `/api/v1/appointment/:id/cancel`

---

## 8. Non-Functional Requirements

### Security

- Password hashing with bcrypt
- JWT token verification
- HTTP-only cookies for auth tokens
- Role-based route protection
- Input validation using Zod
- Protected ownership checks for appointment access

### Performance

- Paginated doctor and appointment listing
- Indexed doctor+appointment datetime uniqueness
- Slot generation should remain lightweight per request

### Architecture

- Express modular backend
- Mongoose models
- Middleware for auth, authorization, validation, and errors
- DTO mapping for appointment responses
- Service helper for slot generation

### Maintainability

- PRD must reflect actual implementation state
- New endpoints should be documented before frontend integration
- Swagger/OpenAPI is the next major documentation milestone

---

## 9. Current Gaps

Not yet complete or not yet integrated:

- Swagger docs
- Frontend doctor browsing integration
- Frontend appointment management integration
- Frontend authenticated session hydration
- Admin dashboard UI
- Test suite coverage
- Full lint cleanup across remaining backend files

---

## 10. Near-Term Roadmap

### Next Priority

1. Add Swagger / OpenAPI docs
2. Connect frontend doctor list and doctor details to backend
3. Connect frontend patient appointments and reschedule/cancel actions
4. Improve auth state persistence on frontend

### Later Enhancements

- Notifications and reminders
- Reviews and ratings
- Payments
- Video consultation
- Medical records
- Analytics and reporting

---

## 11. Success Criteria

The current phase is successful when:

- User can register, verify email, and log in successfully
- Verified doctors can be listed and booked
- Appointment booking blocks invalid or already-booked slots
- Patient can view, cancel, and reschedule own appointments
- Doctor can manage appointment status
- Admin can verify doctors and intervene when needed
- Frontend can integrate against stable backend contracts

---

## 12. Constraints

- Single-region/single-project deployment assumptions
- No production-scale infra yet
- Backend maturity is ahead of frontend maturity
- Documentation and testing still trail implementation

---
## 13. Gaps
Implemented full-stack app (React/Vite frontend with routing, `AuthContext`, API client and payment client; Express/Mongo backend with auth, JWT access/refresh cookies, controllers for users/doctors/appointments/payments/notifications/reviews, Cloudinary upload and seeder). Remaining work (priority order): remove/rotate secrets and add `.env.example` + Backend README (critical, 1–2 hrs); verify and harden cookie/refresh-token behavior and document CORS (`withCredentials`) (2–4 hrs); implement frontend token-persistence/automatic refresh (4–8 hrs); add basic security hardening (helmet, rate limiting, input sanitation) (4–8 hrs); add unit/E2E tests for key flows (1–3 days); add CI/CD and containerization (Docker + deploy pipeline) (1–3 days). Total estimated polish time: ~3–10 days depending on depth; critical immediate action: remove .env and rotate credentials.