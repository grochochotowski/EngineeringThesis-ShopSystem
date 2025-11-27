/**
 * Shipment Statuses Dictionary
 * Enum mapping from backend ShipmentStatus enum
 */

export const shipmentStatusesData = [
    {
        id: 0,
        value: "Unspecified",
        description: "Undefined shipment status"
    },
    {
        id: 1,
        value: "InPrepration",
        description: "Shipment being prepared for dispatch"
    },
    {
        id: 2,
        value: "Prepared",
        description: "Shipment ready for dispatch"
    },
    {
        id: 3,
        value: "InTransit",
        description: "Shipment in transit to destination"
    },
    {
        id: 4,
        value: "Delivered",
        description: "Shipment delivered to recipient"
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
