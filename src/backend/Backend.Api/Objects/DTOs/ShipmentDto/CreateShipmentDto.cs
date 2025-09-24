using Backend.Api.Objects.Entities.Models;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs.ShipmentDto
{
    public class CreateShipmentDto
    {
        [Required] public ShipmentType? Type { get; set; }
        [Required] public ShipmentStatus? Status { get; set; }

        [Required] public DateTime SendDate { get; set; }
        [Required] public DateTime DeliveryDate { get; set; }

        [Range(1, int.MaxValue)] public int ParcelId { get; set; }
        [Range(1, int.MaxValue)] public int DeliveryCompanyId { get; set; }
        [Range(1, int.MaxValue)] public int AddressSenderId { get; set; }
        [Range(1, int.MaxValue)] public int AddressReceiverId { get; set; }
    }
}
