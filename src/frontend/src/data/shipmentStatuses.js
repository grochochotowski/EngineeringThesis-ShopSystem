/**
 * Shipment Statuses Dictionary
 * Enum mapping from backend ShipmentStatus enum
 *
 * Workflow:
 * INCOMING: InPreparation → AwaitingPickup → InTransit → Delivered → Collected
 * OUTGOING: InPreparation → AwaitingPickup → InTransit → Delivered
 *
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
    value: "AwaitingPickup",
    description: "Shipment packed and ready for carrier pickup"
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
    value: "Collected",
    description: "Products collected and stored in warehouse (incoming only) - comes AFTER delivery"
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
