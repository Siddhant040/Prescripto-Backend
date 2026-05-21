export const mapReviewToDTO = (review) => ({
  id: review._id,
  rating: review.rating,
  review: review.review,
  isEdited: review.isEdited,
  isDeleted: review.isDeleted,
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,

  patient: review.patient && {
    id: review.patient._id ?? review.patient,
    name: review.patient.name,
    email: review.patient.email,
    avatar: review.patient.avatar
  },

  doctor: review.doctor && {
    id: review.doctor._id ?? review.doctor,
    userId: review.doctor.user?._id,
    name: review.doctor.user?.name,
    email: review.doctor.user?.email,
    avatar: review.doctor.user?.avatar,
    specialization: review.doctor.specialization,
    consultationFee: review.doctor.consultationFee,
    rating: review.doctor.rating,
    totalReviews: review.doctor.totalReviews
  },

  appointment: review.appointment && {
    id: review.appointment._id ?? review.appointment,
    date: review.appointment.appointmentDateTime,
    status: review.appointment.status
  }
});

export const mapReviewsToDTO = (reviews = []) => reviews.map(mapReviewToDTO);
