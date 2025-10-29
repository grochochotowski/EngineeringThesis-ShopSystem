using Backend.Api.Objects.Entities.Models.Relations;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    [Index(nameof(SKU), IsUnique = true)]
    public class Product
    {
        // --- Key ---
        [Key] public int Id { get; set; }

        // --- Basic fields ---
        [MaxLength(64)]     public string SKU         { get; set; } = default!;
        [MaxLength(64)]     public string Name        { get; set; } = default!;
        [MaxLength(256)]    public string Description { get; set; } = default!;
        [Precision(18, 2)]  public decimal Price      { get; set; }

        [MaxLength(256)]
        public string? DefectDescription { get; set; }
        public bool Defective            { get; set; }


        // --- Foreign Keys ---
        public int CategoryId { get; set; }
        public int TaxRateId  { get; set; }

        // --- Navigation Properties ---
        public virtual Category Category { get; set; } = default!;
        public virtual TaxRate TaxRate { get; set; } = default!;

        // --- Collections (N:N, 1:N) ---
        public virtual ICollection<WarehouseProduct> WarehouseProducts { get; set; } = new List<WarehouseProduct>();
        public virtual ICollection<ParcelProduct> ParcelProducts { get; set; } = new List<ParcelProduct>();
    }
}
