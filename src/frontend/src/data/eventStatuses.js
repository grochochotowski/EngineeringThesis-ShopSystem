/**
 * Event Statuses Dictionary
 * Enum mapping from backend EventStatus enum
 *
 * Workflow:
 * Created → Published → Finished
 * Alternative: Created/Published → Canceled
 */

export const eventStatusesData = [
  {
    id: 0,
    value: "Created",
    description: "Event created but not published yet"
  },
  {
    id: 1,
    value: "Published",
    description: "Event published and visible to public"
  },
  {
    id: 2,
    value: "Finished",
    description: "Event has concluded"
  },
  {
    id: 3,
    value: "Canceled",
    description: "Event was canceled"
  },
];

export const eventStatuses = {
  Created: "Created",
  Published: "Published",
  Finished: "Finished",
  Canceled: "Canceled",
};
