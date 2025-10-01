using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class Shipment
    {
        [Key] public int Id { get; set; }

        [Required] public ShipmentType Type { get; set; }
        [Required] public ShipmentStatus Status { get; set; }

        [Required] public DateTimeOffset SendDate { get; set; }
        [Required] public DateTimeOffset DeliveryDate { get; set; }

        // relationships 1:N (1 Shipment - X Parcels)
        public virtual ICollection<Parcel> Parcels { get; set; } = new List<Parcel>();

        // relationships N:1 (1 Shipment - X DeliveryCompany)
        [Required] public int DeliveryCompanyId { get; set; }
                public virtual DeliveryCompany DeliveryCompany { get; set; } = default!;

        // relationships 1:1 (1 Shipment - 1 AddressSender/AddressReceiver)
        [Required] public int AddressSenderId { get; set; }
                public virtual Address AddressSender { get; set; } = default!;
        [Required] public int AddressReceiverId { get; set; }
                public virtual Address AddressReceiver { get; set; } = default!;

    }
}
