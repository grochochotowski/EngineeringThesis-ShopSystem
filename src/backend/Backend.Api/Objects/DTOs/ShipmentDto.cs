using Backend.Api.Objects.Entities.Models;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    public class GetShipmentDto
    {
        public int Id { get; set; }
        public ShipmentType Type { get; set; }
        public ShipmentStatus Status { get; set; }
        public DateTimeOffset SendDate { get; set; }
        public DateTimeOffset DeliveryDate { get; set; }

        public int DeliveryCompanyId { get; set; }
        public int AddressSenderId { get; set; }
        public int AddressReceiverId { get; set; }
    }

    public class GetShipmentParcelsDto
    {
        public IEnumerable<GetParcelDto> Parcels { get; set; } = default!;
    }

    public class CreateShipmentDto
    {
        [Required] public ShipmentType Type { get; set; }
        [Required] public ShipmentStatus Status { get; set; }
        [Required] public DateTimeOffset SendDate { get; set; }
        [Required] public DateTimeOffset DeliveryDate { get; set; }

        [Required] public int DeliveryCompanyId { get; set; }
        [Required] public int AddressSenderId { get; set; }
        [Required] public int AddressReceiverId { get; set; }
    }

    public class UpdateShipmentDto
    {
        [Required] public ShipmentType Type { get; set; }
        [Required] public ShipmentStatus Status { get; set; }
        [Required] public DateTimeOffset SendDate { get; set; }
        [Required] public DateTimeOffset DeliveryDate { get; set; }

        [Required] public int DeliveryCompanyId { get; set; }
        [Required] public int AddressSenderId { get; set; }
        [Required] public int AddressReceiverId { get; set; }
    }

    public class UpdateShipmentStatusDto
    {
        [Required] public ShipmentStatus Status { get; set; }
    }

    public class AddParcelsToShipmentDto
    {
        [Required, MinLength(1)] public List<int> ParcelIds { get; set; } = new();
    }

    public class RemoveParcelsFromShipmentDto
    {
        [Required, MinLength(1)] public List<int> ParcelIds { get; set; } = new();
    }
}
