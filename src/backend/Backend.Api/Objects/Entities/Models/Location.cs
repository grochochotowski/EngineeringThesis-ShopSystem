using Backend.Api.Objects.Entities.Models.Relations;

namespace Backend.Api.Objects.Entities.Models
{
    public class Location
    {
        // --- Key ---
        public int Id { get; set; }

        // --- Basic fields ---
        public string Zone { get; set; } = default!;
        public string Col { get; set; } = default!;
        public string Shelf { get; set; } = default!;
        public string LocationCode { get; set; } = default!;

        // --- Collections (1:N) ---
        public virtual ICollection<ProductsInWarehouse> Products { get; set; } = new List<ProductsInWarehouse>();
    }
}
