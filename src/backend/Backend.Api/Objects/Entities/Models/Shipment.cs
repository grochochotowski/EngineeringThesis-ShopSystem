using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class Shipment
    {
        [Key] public int Id { get; set; }

        [Required] public ShipmentType Type { get; set; }
        [Required] public ShipmentStatus Status { get; set; }

        [Required] public DateTime SendDate { get; set; }
        [Required] public DateTime DeliveryDate { get; set; }

        // relationships 1:1
        [Required] public int ParcelId { get; set; }
                public virtual Parcel Parcel { get; set; } = default!;

        // relationships N:1
        [Required] public int DeliveryCompanyId { get; set; }
                public virtual DeliveryCompany DeliveryCompany { get; set; } = default!;
        [Required] public int AddressSenderId { get; set; }
                public virtual Address AddressSender { get; set; } = default!;
        [Required] public int AddressReceiverId { get; set; }
                public virtual Address AddressReceiver { get; set; } = default!;

    }
}
