export const mapPaymentToDTO = (payment) => ({
  id: payment._id,
  amount: payment.amount,
  currency: payment.currency,
  status: payment.status,
  provider: payment.provider,
  providerOrderId: payment.providerOrderId,
  providerPaymentId: payment.providerPaymentId,
  paidAt: payment.paidAt,
  failedAt: payment.failedAt,
  refundedAt: payment.refundedAt,
  failureReason: payment.failureReason,
  refundReason: payment.refundReason,
  createdAt: payment.createdAt,
  updatedAt: payment.updatedAt,

  appointment: payment.appointment && {
    id: payment.appointment._id ?? payment.appointment,
    date: payment.appointment.appointmentDateTime,
    status: payment.appointment.status
  },

  patient: payment.patient && {
    id: payment.patient._id ?? payment.patient,
    name: payment.patient.name,
    email: payment.patient.email,
    avatar: payment.patient.avatar
  },

  doctor: payment.doctor && {
    id: payment.doctor._id ?? payment.doctor,
    userId: payment.doctor.user?._id,
    name: payment.doctor.user?.name,
    email: payment.doctor.user?.email,
    avatar: payment.doctor.user?.avatar,
    specialization: payment.doctor.specialization,
    consultationFee: payment.doctor.consultationFee
  }
});

export const mapPaymentsToDTO = (payments = []) => payments.map(mapPaymentToDTO);
