namespace Backend.Api.Objects.Entities.Models;

public enum ShipmentType
{
    Unspecified = 0,
    Incoming = 1,   // incoming shipment to the store / warehouse
    Outgoing = 2    // outgoing shipment to the store / warehouse
}