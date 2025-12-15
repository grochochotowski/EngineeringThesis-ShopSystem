namespace Backend.Api.Objects.Entities.Models;

/// <summary>
/// Shipment Status - Lifecycle stages of a shipment
///
/// Workflow progression:
/// 1. InPreparation → 2. ReadyToCollect → 3. Collected → 4. InTransit → 5. Delivered
///
/// Alternative endings: Cancelled (from any status), Returned (from InTransit/Delivered)
///
/// Validation rules:
/// - InPreparation: All fields optional (dimensions, sender/receiver, dates)
/// - ReadyToCollect+: Dimensions and sender/receiver required
/// - Collected+: SendDate required
/// - Delivered: DeliveryDate required
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
    /// Shipment is packed and ready to be collected by carrier or customer
    /// Dimensions and sender/receiver information must be complete
    /// </summary>
    ReadyToCollect = 2,

    /// <summary>
    /// Shipment has been collected by carrier or customer
    /// SendDate is set automatically when transitioning to this status
    /// </summary>
    Collected = 3,

    /// <summary>
    /// Shipment is in transit to destination
    /// Tracking updates can be added at this stage
    /// </summary>
    InTransit = 4,

    /// <summary>
    /// Shipment successfully delivered to recipient
    /// DeliveryDate is set when transitioning to this status
    /// </summary>
    Delivered = 5,

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
