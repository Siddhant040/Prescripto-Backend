# PRESCRIPTO+ — PRODUCT REQUIREMENTS DOCUMENT (PRD)

---

## 1. PRODUCT OVERVIEW

**Product Name:** Prescripto+
**Version:** v1 (MVP)
**Timeline:** 4–6 weeks
**Type:** Full-stack MERN application

**Goal:**
Enable patients to discover doctors and book appointments efficiently through a web platform.

---

## 2. PROBLEM STATEMENT

Patients face:

- Difficulty finding relevant doctors quickly
- Manual appointment booking (calls/visits)
- No centralized system for managing appointments

---

## 3. MVP SCOPE

### ✅ Included

- User authentication (Patient + Admin)
- Doctor listing
- Appointment booking
- Basic admin panel

### ❌ Excluded (Future Phases)

- Payments
- Video consultation
- Medical records
- Reviews
- AI features

---

## 4. USER ROLES

### Patient

- Register/login
- View doctors
- Book appointment
- View own appointments

### Admin

- Add/edit doctors
- View all appointments

---

## 5. CORE FEATURES

### 5.1 Authentication

- Email/password signup & login
- JWT-based authentication
- Password hashing (bcrypt)

---

### 5.2 Doctor Listing

- Fetch all doctors

- Display:
  - name
  - specialization
  - fees

- Basic filtering:
  - specialization

---

### 5.3 Appointment Booking

**Flow:**

1. Select doctor
2. Select date & time
3. Confirm booking

**Rules:**

- Status = `"pending"`
- No reschedule
- No cancellation

---

### 5.4 Admin Panel

- Add doctor
- View all appointments

---

## 6. DATA MODELS

### User

```js
{
  name,
  email,
  password,
  role: "patient" | "admin"
}
```

### Doctor

```js
{
  ;(name, specialization, fees, availableSlots)
}
```

### Appointment

```js
{
  userId,
  doctorId,
  date,
  time,
  status: "pending"
}
```

---

## 7. API DESIGN

### Auth

- POST `/api/v1/auth/register`
- POST `/api/v1/auth/login`

### Doctor

- GET `/api/v1/doctors`
- POST `/api/v1/doctors` (admin)

### Appointment

- POST `/api/v1/appointments`
- GET `/api/v1/appointments` (admin)

---

## 8. NON-FUNCTIONAL REQUIREMENTS

### Performance

- API response < 500ms

### Security

- bcrypt password hashing
- JWT authentication
- Basic input validation

### Architecture

- MVC + Service Layer
- Centralized error handling

---

## 9. VERSION ROADMAP

### v1 (MVP)

- Auth
- Doctor listing
- Appointment booking
- Admin panel

### v2

- Appointment status system
- Doctor dashboard
- Pagination

### v3

- Real-time updates (Socket.IO)
- Notifications

### v4

- Payments (Razorpay)
- Refund system

### v5

- AI recommendation
- Analytics

---

## 10. SUCCESS CRITERIA

- Booking works without failure
- Admin can manage doctors
- Handles 100+ users
- Clean code structure

---

## 11. CONSTRAINTS

- Single location only
- No production-level scaling yet
- Backend quality > UI polish

---
