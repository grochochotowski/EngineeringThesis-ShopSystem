using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models.Relations
{
    public class ProductsInWarehouse
    {
        // --- Composite Key ---
        public int ProductId { get; set; }
        public int LocationId { get; set; }

        // --- Key Navigation Properties ---
        public virtual Product Product { get; set; } = default!;
        public virtual Location Location { get; set; } = default!;

        // --- Basic fields ---
        [Range(0, int.MaxValue)]
        public int Quantity { get; set; }
    }
}
