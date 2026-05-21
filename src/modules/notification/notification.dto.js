export const mapNotificationToDTO = (notification) => ({
  id: notification._id,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  isRead: notification.isRead,
  entityId: notification.entityId,
  entityType: notification.entityType,
  createdAt: notification.createdAt,
  updatedAt: notification.updatedAt,
  sender: notification.sender && {
    id: notification.sender._id ?? notification.sender,
    name: notification.sender.name,
    email: notification.sender.email,
    avatar: notification.sender.avatar
  }
});

export const mapNotificationsToDTO = (notifications = []) =>
  notifications.map(mapNotificationToDTO);
