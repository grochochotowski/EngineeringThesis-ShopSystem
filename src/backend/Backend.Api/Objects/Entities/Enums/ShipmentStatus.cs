namespace Backend.Api.Objects.Entities.Models;

public enum ShipmentStatus
{
    Unspecified = 0,
    InPrepration = 1,
    Prepared = 2,
    InTransit = 3,
    Delivered = 4,
    Cancelled = 5,
    Returned = 6
}