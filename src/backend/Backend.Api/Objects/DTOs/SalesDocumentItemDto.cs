using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    public class GetSalesDocumentItemDto
    {
                                            public int Id                   { get; set; }
                                            public int SalesDocumentId      { get; set; }
                                            public int ProductId            { get; set; }
                                            public string ProductName       { get; set; } = default!;
                                            public string ProductSKU        { get; set; } = default!;
                                            public int Quantity             { get; set; }
                                            public decimal UnitPriceNet     { get; set; }
                                            public int TaxRateId            { get; set; }
                                            public string TaxCode           { get; set; } = default!;
                                            public decimal LineNet          { get; set; }
                                            public decimal LineTax          { get; set; }
                                            public decimal LineGross        { get; set; }
    }

    public class CreateSalesDocumentItemDto
    {
        [Required]                          public int ProductId            { get; set; }
        [Required, MaxLength(128)]          public string ProductName       { get; set; } = default!;
        [Required, MaxLength(64)]           public string ProductSKU        { get; set; } = default!;
        [Required, Range(1, int.MaxValue)]  public int Quantity             { get; set; }
        [Required]                          public decimal UnitPriceNet     { get; set; }
        [Required]                          public int TaxRateId            { get; set; }
    }

    public class UpdateSalesDocumentItemDto
    {
        [Required]                          public int Id                   { get; set; }
        [Required]                          public int ProductId            { get; set; }
        [Required, MaxLength(128)]          public string ProductName       { get; set; } = default!;
        [Required, MaxLength(64)]           public string ProductSKU        { get; set; } = default!;
        [Required, Range(1, int.MaxValue)]  public int Quantity             { get; set; }
        [Required]                          public decimal UnitPriceNet     { get; set; }
        [Required]                          public int TaxRateId            { get; set; }
    }
}
