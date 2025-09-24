using Backend.Api.Objects.Entities.Models;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs.ShipmentDto
{
    public class GetShipmentDto
    {
        public int Id { get; set; }

        public ShipmentType Type { get; set; }
        public ShipmentStatus Status { get; set; }

        public DateTime SendDate { get; set; }
        public DateTime DeliveryDate { get; set; }

        public int ParcelId { get; set; }
        public int DeliveryCompanyId { get; set; }
        public int AddressSenderId { get; set; }
        public int AddressReceiverId { get; set; }
    }
}
