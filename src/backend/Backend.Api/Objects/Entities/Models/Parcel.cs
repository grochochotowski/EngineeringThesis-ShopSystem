using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class Parcel
    {
        [Key] public int Id { get; set; }
        [Required, MaxLength(256)] public string Description { get; set; } = default!;
        [Required, Precision(18, 3)] public decimal Weight { get; set; }
        [Required, Precision(18, 3)] public decimal Length { get; set; }
        [Required, Precision(18, 3)] public decimal Width { get; set; }
        [Required, Precision(18, 3)] public decimal Height { get; set; }

        // relationships N:1 (X Parcel - 1 Shipment)
        public int? ShipmentId { get; set; }
        public virtual Shipment? Shipment { get; set; }

        // relationships N:N (X Parcel - X Products)
        public virtual ICollection<Product> Products { get; set; } = new List<Product>();
    }
}
