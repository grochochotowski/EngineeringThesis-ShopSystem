using Backend.Api.Objects.Entities.Models.Relations;

namespace Backend.Api.Objects.Entities.Models
{
    public class Product
    {
        // --- Key ---
        public int Id { get; set; }

        // --- Basic fields ---
        public string SKU                   { get; set; } = default!;
        public string Name                  { get; set; } = default!;
        public string Description           { get; set; } = default!;
        public decimal Price                { get; set; }
        public string? DefectDescription    { get; set; }
        public bool Defective               { get; set; }
        public bool IsActive                { get; set; } = true;


        // --- Foreign Keys ---
        public int CategoryId { get; set; }
        public int TaxRateId  { get; set; }

        // --- Navigation Properties ---
        public virtual Category Category    { get; set; } = default!;
        public virtual TaxRate TaxRate      { get; set; } = default!;

        // --- Collections (N:N, 1:N) ---
        public virtual ICollection<ProductsInWarehouse> ProductsInWarehouse { get; set; } = new List<ProductsInWarehouse>();
        public virtual ICollection<ShipmentProduct> ShipmentProducts        { get; set; } = new List<ShipmentProduct>();
    }
}
