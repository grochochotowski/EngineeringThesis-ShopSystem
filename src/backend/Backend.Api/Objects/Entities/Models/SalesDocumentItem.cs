using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class SalesDocumentItem
    {
        // --- Key ---
        [Key] public int Id { get; set; }

        // --- Basic fields ---
        [MaxLength(128)]         public string ProductName   { get; set; } = default!;
        [MaxLength(64)]          public string ProductSKU    { get; set; } = default!;
        [Precision(18, 4)]       public decimal UnitPriceNet { get; set; }
        [Precision(18, 2)]       public decimal LineNet      { get; set; }
        [Precision(18, 2)]       public decimal LineTax      { get; set; }
        [Precision(18, 2)]       public decimal LineGross    { get; set; }
        [Range(1, int.MaxValue)] public int Quantity         { get; set; }

        // --- Foreign Keys ---
        public int SalesDocumentId  { get; set; }
        public int ProductId        { get; set; }
        public int TaxRateId        { get; set; }

        // --- Navigation Properties ---
        public virtual SalesDocument SalesDocument  { get; set; } = default!;
        public virtual Product Product              { get; set; } = default!;
        public virtual TaxRate TaxRate {             get; set; } = default!;
    }
}