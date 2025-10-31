using Backend.Api.Objects.Entities.Models.Relations;

namespace Backend.Api.Objects.Entities.Models
{
    public class Warehouse
    {
        // --- Key ---
        public int Id { get; set; }

        // --- Basic fields ---
        public string Name { get; set; } = default!;

        // --- Foreign Keys ---
        public int AddressId  { get; set; }

        // --- Navigation Properties ---
        public virtual Address Address { get; set; } = default!;

        // --- Collections (N:N, 1:N) ---
        public ICollection<WarehouseProduct> WarehouseProducts { get; set; } = new List<WarehouseProduct>();
    }
}
