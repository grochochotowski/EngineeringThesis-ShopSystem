using Backend.Api.Objects.Entities.Models.Relations;

namespace Backend.Api.Objects.Entities.Models
{
    public class Parcel
    {
        // --- Key ---
        public int Id { get; set; }

        // --- Basic fields ---
        public string Description  { get; set; } = default!;
        public decimal Weight      { get; set; }
        public decimal Length      { get; set; }
        public decimal Width       { get; set; }
        public decimal Height      { get; set; }

        // --- Foreign Keys ---
        public int? ShipmentId { get; set; }

        // --- Navigation Properties ---
        public virtual Shipment? Shipment { get; set; }

        // --- Collections (N:N, 1:N) ---
        public virtual ICollection<ParcelProduct> ParcelProducts { get; set; } = new List<ParcelProduct>();
    }
}
