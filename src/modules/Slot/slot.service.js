const addMinutes = (date, mins) => {
  return new Date(date.getTime() + mins * 60000);
};

export const generateSlots = (date, doctor) => {
  const sourceDate = new Date(date);
sourceDate.setHours(0, 0, 0, 0);

  if (Number.isNaN(sourceDate.getTime())) return [];

  const baseDate = new Date(sourceDate);
  baseDate.setHours(0, 0, 0, 0);

  const dayName = baseDate.toLocaleDateString("en-US", {
    weekday: "long"
  });

  const availability = doctor?.availability ?? [];

  const dayAvailability = availability.find(
    (d) => d.day === dayName
  );

  if (!dayAvailability) return [];

  const slots = [];
  const duration = doctor.slotDuration || 30;

  for (const range of dayAvailability.slots || []) {
    if (!range.start || !range.end) continue;

    const [sh, sm] = range.start.split(":").map(Number);
    const [eh, em] = range.end.split(":").map(Number);

    let current = new Date(baseDate);
    current.setHours(sh, sm, 0, 0);

    const end = new Date(baseDate);
    end.setHours(eh, em, 0, 0);

    while (addMinutes(current, duration) <= end) {
      slots.push(new Date(current));
      current = addMinutes(current, duration);
    }
  }

  return slots.sort((a, b) => a - b);
};

export const filterBookedSlots = (slots, appointments) => {
  const bookedSet = new Set(
    appointments.map(a => a.appointmentDateTime.getTime())
  );

  return slots.filter(slot => !bookedSet.has(slot.getTime()));
};