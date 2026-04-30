export const UserRoleEnum = {
    ADMIN: "admin",
    PATIENT: "patient",
    DOCTOR: "doctor"
};
export const AvailableRole = Object.values(UserRoleEnum);

export const TaskStatusEnum = {
    TODO: "todo",
    IN_PROGRESS: "in_progress",
    DONE: "done"
};

export const AvailableTaskStatus = Object.values(TaskStatusEnum);