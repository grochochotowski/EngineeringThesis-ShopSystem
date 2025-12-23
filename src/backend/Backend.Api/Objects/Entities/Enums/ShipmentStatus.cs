namespace Backend.Api.Objects.Entities.Models;

/// <summary>
/// Shipment Status - Lifecycle stages of a shipment
///
/// Workflow progression:
/// INCOMING: 1. InPreparation → 2. AwaitingPickup → 3. InTransit → 4. Delivered → 5. Collected
/// OUTGOING: 1. InPreparation → 2. AwaitingPickup → 3. InTransit → 4. Delivered
///
/// Alternative endings: Cancelled (from any status), Returned (from InTransit/Delivered)
///
/// Validation rules:
/// - InPreparation: All fields optional (dimensions, sender/receiver, dates)
/// - AwaitingPickup: Dimensions and sender/receiver required - ready for carrier pickup
/// - InTransit+: SendDate auto-set if not provided
/// - Delivered: DeliveryDate auto-set if not provided
/// - Collected: Incoming shipments only - warehouse staff has physically collected and stored products (AFTER delivery)
/// </summary>
public enum ShipmentStatus
{
    /// <summary>
    /// Unspecified status (default/invalid state)
    /// </summary>
    Unspecified = 0,

    /// <summary>
    /// Shipment is being prepared - dimensions, sender/receiver can still be modified
    /// All fields are optional at this stage
    /// </summary>
    InPreparation = 1,

    /// <summary>
    /// Shipment is packed and ready for carrier pickup
    /// Dimensions and sender/receiver information must be complete
    /// For incoming: follows InPreparation status
    /// For outgoing: follows InPreparation status
    /// </summary>
    AwaitingPickup = 2,

    /// <summary>
    /// Shipment is in transit to destination
    /// SendDate is set automatically when transitioning to this status if not already set
    /// Tracking updates can be added at this stage
    /// </summary>
    InTransit = 3,

    /// <summary>
    /// Shipment successfully delivered to recipient
    /// DeliveryDate is set automatically when transitioning to this status if not already set
    /// For incoming shipments: after this status, warehouse staff can proceed to Collected
    /// </summary>
    Delivered = 4,

    /// <summary>
    /// INCOMING ONLY: Warehouse staff has physically collected products and stored them in locations
    /// Collection data (declared vs collected quantities) is recorded in ShipmentProductCollection table
    /// Products are now available in warehouse inventory
    /// This status comes AFTER Delivered for incoming shipments
    /// </summary>
    Collected = 5,

    /// <summary>
    /// Shipment cancelled (can be set from any status)
    /// No further status transitions allowed after cancellation
    /// </summary>
    Cancelled = 6,

    /// <summary>
    /// Shipment returned to sender (e.g., delivery failed, customer refused)
    /// Can only be set from InTransit or Delivered status
    /// </summary>
    Returned = 7
}
