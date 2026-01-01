using Backend.Api.Objects.Entities.Models;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    // --- POS FINALIZATION REQUEST ---
    public class POSFinalizationDto
    {
        [Required]                      public SalesDocumentType DocumentType       { get; set; }
                                        public int? ClientId                        { get; set; }
        [Required]                      public List<POSCartItemDto> Items           { get; set; } = new();
        [Required]                      public List<POSPaymentDto> Payments         { get; set; } = new();
        [Required]                      public int UserId                           { get; set; } // User performing the transaction
    }

    // --- POS CART ITEM ---
    public class POSCartItemDto
    {
        [Required]                          public int ProductId            { get; set; }
        [Required, MaxLength(128)]          public string ProductName       { get; set; } = default!;
        [Required, MaxLength(64)]           public string ProductSKU        { get; set; } = default!;
        [Required, Range(1, int.MaxValue)]  public int Quantity             { get; set; }
        [Required]                          public decimal UnitGross        { get; set; }
        [Required]                          public int TaxRateId            { get; set; }
                                            public int? FromLocationId      { get; set; } // Optional - null for digital products like gift cards
    }

    // --- POS PAYMENT ---
    public class POSPaymentDto
    {
        [Required]                          public PaymentOption PaymentOption  { get; set; }
        [Required, Range(0.01, double.MaxValue)]  public decimal Amount       { get; set; }
        [Range(0, double.MaxValue)]         public decimal? AmountTendered      { get; set; }
        [Range(0, double.MaxValue)]         public decimal? Change              { get; set; }
                                            public int? GiftCardId              { get; set; }
    }

    // --- POS FINALIZATION RESPONSE ---
    public class POSFinalizationResponseDto
    {
        public int SalesDocumentId      { get; set; }
        public string DocumentNumber    { get; set; } = default!;
        public DateTimeOffset IssueDate { get; set; }
        public decimal TotalNet         { get; set; }
        public decimal TotalTax         { get; set; }
        public decimal TotalGross       { get; set; }
        public decimal Change           { get; set; }
    }
}
