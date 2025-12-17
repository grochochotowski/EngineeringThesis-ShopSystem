/**
 * Shipment Statuses Dictionary
 * Enum mapping from backend ShipmentStatus enum
 *
 * Workflow: InPreparation → ReadyToCollect → InTransit → Delivered
 * Alternative endings: Cancelled (from any status), Returned (from InTransit/Delivered)
 */

export const shipmentStatusesData = [
  {
    id: 0,
    value: "Unspecified",
    description: "Undefined shipment status"
  },
  {
    id: 1,
    value: "InPreparation",
    description: "Shipment being prepared - dimensions and details can be modified"
  },
  {
    id: 2,
    value: "ReadyToCollect",
    description: "Shipment packed and ready for collection"
  },
  {
    id: 3,
    value: "InTransit",
    description: "Shipment in transit to destination"
  },
  {
    id: 4,
    value: "Delivered",
    description: "Shipment successfully delivered to recipient"
  },
  {
    id: 5,
    value: "Cancelled",
    description: "Shipment cancelled"
  },
  {
    id: 6,
    value: "Returned",
    description: "Shipment returned to sender"
  },
];
