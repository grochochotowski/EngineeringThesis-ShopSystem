namespace Backend.Api.Objects.Entities.Models
{
    public class SalesDocumentItem
    {
        // --- Key ---
        public int Id { get; set; }

        // --- Basic fields ---
        public string ProductName   { get; set; } = default!;
        public string ProductSKU    { get; set; } = default!;
        public decimal UnitGross    { get; set; } // Unit price including tax
        public decimal LineNet      { get; set; }
        public decimal LineTax      { get; set; }
        public decimal LineGross    { get; set; }
        public int Quantity         { get; set; }

        // --- Foreign Keys ---
        public int SalesDocumentId  { get; set; }
        public int ProductId        { get; set; }
        public int TaxRateId        { get; set; }
        public int? FromLocationId  { get; set; } // nullable for backward compatibility

        // --- Navigation Properties ---
        public virtual SalesDocument SalesDocument  { get; set; } = default!;
        public virtual Product Product              { get; set; } = default!;
        public virtual TaxRate TaxRate              { get; set; } = default!;
        public virtual Location? FromLocation       { get; set; }
    }
}