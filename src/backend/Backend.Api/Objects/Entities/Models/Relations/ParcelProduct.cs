using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models.Relations
{
    public class ParcelProduct
    {
        // --- Key ---
        public int ParcelId  { get; set; }
        public int ProductId { get; set; }

        // --- Key Navigation Properties ---
        public virtual Parcel Parcel    { get; set; } = default!;
        public virtual Product Product  { get; set; } = default!;

        // --- Basic fields ---
        [Range(0, int.MaxValue)] public int Quantity { get; set; }
    }
}
