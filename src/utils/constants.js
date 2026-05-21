export const UserRoleEnum = {
    ADMIN: "admin",
    PATIENT: "patient",
    DOCTOR: "doctor"
};
export const AvailableRole = Object.values(UserRoleEnum);


export const APPOINTMENT_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "completed"
};

export const AvailableAppointmentStatus = Object.values(APPOINTMENT_STATUS);

export const NOTIFICATION_TYPES = {
  APPOINTMENT_BOOKED: "appointment_booked",
  APPOINTMENT_CANCELLED: "appointment_cancelled",
  APPOINTMENT_RESCHEDULED: "appointment_rescheduled",
  APPOINTMENT_CONFIRMED: "appointment_confirmed",
  APPOINTMENT_COMPLETED: "appointment_completed",
  REVIEW_CREATED: "review_created"
};

export const AvailableNotificationTypes = Object.values(NOTIFICATION_TYPES);

export const DaysOfWeek = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];
