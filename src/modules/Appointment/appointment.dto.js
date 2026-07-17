export const mapAppointmentToDTO = (appointment) => ({
  id: appointment._id,
  date: appointment.appointmentDateTime,
  status: appointment.status,
  prescription : appointment.prescription,

  doctor: appointment.doctor && {
    id: appointment.doctor._id,
    userId: appointment.doctor.user?._id,
    name: appointment.doctor.user?.name,
    specialization: appointment.doctor.specialization,
    consultationFee: appointment.doctor.consultationFee,
    avatar: appointment.doctor.user?.avatar,
    email: appointment.doctor.user?.email,
    clinicAddress: appointment.doctor.clinicAddress
  },

  patient: appointment.patient && {
    id: appointment.patient._id,
    name: appointment.patient.name,
    email: appointment.patient.email,
    avatar: appointment.patient.avatar,
    gender: appointment.patient.gender,
    dateOfBirth: appointment.patient.dateOfBirth,
    phone: appointment.patient.phone,
    address: appointment.patient.address

  }
});
