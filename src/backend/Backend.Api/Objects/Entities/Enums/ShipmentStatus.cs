namespace Backend.Api.Objects.Entities.Models;

public enum ShipmentStatus
{
    InPrepration = 0,
    Prepared = 1,
    InTransit = 2,
    Delivered = 3,
    Cancelled = 4,
    Returned = 5
}