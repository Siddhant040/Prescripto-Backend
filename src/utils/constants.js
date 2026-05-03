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