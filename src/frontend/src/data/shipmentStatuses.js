/**
 * Shipment Statuses Dictionary
 * Enum mapping from backend ShipmentStatus enum
 *
 * Workflow: InPreparation → ReadyToCollect → Collected → InTransit → Delivered
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
    value: "Collected",
    description: "Shipment collected by carrier or customer"
  },
  {
    id: 4,
    value: "InTransit",
    description: "Shipment in transit to destination"
  },
  {
    id: 5,
    value: "Delivered",
    description: "Shipment successfully delivered to recipient"
  },
  {
    id: 6,
    value: "Cancelled",
    description: "Shipment cancelled"
  },
  {
    id: 7,
    value: "Returned",
    description: "Shipment returned to sender"
  },
];
