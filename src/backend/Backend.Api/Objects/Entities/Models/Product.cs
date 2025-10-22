using Backend.Api.Objects.Entities.Models.Relations;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class Product
    {
        [Key] public int Id { get; set; }
        [Required, MaxLength(64)] public string SKU { get; set; } = default!;
        [Required, MaxLength(64)] public string Name { get; set; } = default!;
        [Required, MaxLength(256)] public string Description { get; set; } = default!;
        [Required, Precision(18, 2)] public decimal Price { get; set; }

        public bool Defective { get; set; }
        [MaxLength(256)] public string? DefectDescription { get; set; }

        // relationships N:1 (1 Product - 1 Category)
        [Required] public int CategoryId { get; set; }
        public virtual Category Category { get; set; } = default!;

        // relationships N:1 (1 Product - 1 TaxRate)
        [Required] public int TaxRateId { get; set; }
        public virtual TaxRate TaxRate { get; set; } = default!;

        // relationships N:N (X Products - X Warehouses/Products)
        public virtual ICollection<WarehouseProduct> WarehouseProducts { get; set; } = new List<WarehouseProduct>();
        public virtual ICollection<ParcelProduct> ParcelProducts { get; set; } = new List<ParcelProduct>();
    }
}
