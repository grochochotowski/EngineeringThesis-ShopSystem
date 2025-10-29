using Backend.Api.Objects.Entities.Models.Relations;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class Parcel
    {
        // --- Key ---
        [Key] public int Id { get; set; }

        // --- Basic fields ---
        [MaxLength(256)]   public string Description  { get; set; } = default!;
        [Precision(18, 3)] public decimal Weight      { get; set; }
        [Precision(18, 3)] public decimal Length      { get; set; }
        [Precision(18, 3)] public decimal Width       { get; set; }
        [Precision(18, 3)] public decimal Height      { get; set; }

        // --- Foreign Keys ---
        public int? ShipmentId { get; set; }

        // --- Navigation Properties ---
        public virtual Shipment? Shipment { get; set; }

        // --- Collections (N:N, 1:N) ---
        public virtual ICollection<ParcelProduct> ParcelProducts { get; set; } = new List<ParcelProduct>();
    }
}
