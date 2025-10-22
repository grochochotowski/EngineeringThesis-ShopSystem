using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class SalesDocumentItem
    {
        [Key] public int Id { get; set; }
        [Required] public int SalesDocumentId { get; set; }
        public virtual SalesDocument SalesDocument { get; set; } = default!;

        // Product
        [Required] public int ProductId { get; set; }
        public virtual Product Product { get; set; } = default!;

        [Required, MaxLength(128)] public string ProductName { get; set; } = default!;
        [Required, MaxLength(64)] public string ProductSKU { get; set; }
        [Required, Range(1, int.MaxValue)] public int Quantity { get; set; }
        [Required, Precision(18, 4)] public decimal UnitPriceNet { get; set; }

        // TAX
        [Required] public int TaxRateId { get; set; }
        public virtual TaxRate TaxRate { get; set; } = default!;

        [Required, Precision(18, 2)] public decimal LineNet { get; set; }
        [Required, Precision(18, 2)] public decimal LineTax { get; set; }
        [Required, Precision(18, 2)] public decimal LineGross { get; set; }
    }
}