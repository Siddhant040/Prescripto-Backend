export const mapAppointmentToDTO = (appointment) => ({
  id: appointment._id,
  date: appointment.appointmentDateTime,
  status: appointment.status,

  doctor: appointment.doctor && {
    id: appointment.doctor._id,
    name: appointment.doctor.name,
    specialization: appointment.doctor.specialization,
    consultationFee: appointment.doctor.consultationFee,
    avatar: appointment.doctor.avatar
  },

  patient: appointment.patient && {
    id: appointment.patient._id,
    name: appointment.patient.name,
    email: appointment.patient.email,
    avatar: appointment.patient.avatar
  }
});