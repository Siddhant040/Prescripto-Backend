export const mapAdminDashboardDTO = (stats) => ({
  users: stats.users,
  doctors: stats.doctors,
  verifiedDoctors: stats.verifiedDoctors,
  appointments: stats.appointments,
  pendingAppointments: stats.pendingAppointments,
  completedAppointments: stats.completedAppointments,
  reviews: stats.reviews,
  activeReviews: stats.activeReviews,
  notifications: stats.notifications
});
