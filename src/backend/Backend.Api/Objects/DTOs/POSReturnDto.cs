using Backend.Api.Objects.Entities.Models;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    // --- POS RETURN REQUEST ---
    public class POSReturnDto
    {
        [Required, MaxLength(64)]       public string OriginalDocumentNumber            { get; set; } = default!;
        [Required]                      public List<POSReturnItemDto> Items             { get; set; } = new();
        [Required]                      public PaymentOption RefundMethod               { get; set; }
        [Required]                      public int UserId                               { get; set; } // User processing the return
    }

    // --- POS RETURN ITEM ---
    public class POSReturnItemDto
    {
        [Required]                              public int OriginalItemId               { get; set; } // ID from original SalesDocumentItem
        [Required]                              public int ProductId                    { get; set; }
        [Required, MaxLength(128)]              public string ProductName               { get; set; } = default!;
        [Required, MaxLength(64)]               public string ProductSKU                { get; set; } = default!;
        [Required, Range(1, int.MaxValue)]      public int ReturnQuantity               { get; set; } // Positive value (will be negated)
        [Required]                              public decimal UnitPriceNet             { get; set; }
        [Required]                              public int TaxRateId                    { get; set; }
        [Required]                              public List<POSReturnLocationDto> Locations { get; set; } = new(); // Multi-location support
    }

    // --- POS RETURN LOCATION ---
    public class POSReturnLocationDto
    {
        [Required]                              public int ToLocationId                 { get; set; } // Where to return the product
        [Required, Range(1, int.MaxValue)]      public int Quantity                     { get; set; } // Quantity to this location
    }

    // --- POS RETURN RESPONSE ---
    public class POSReturnResponseDto
    {
        public int ReturnDocumentId             { get; set; }
        public string ReturnDocumentNumber      { get; set; } = default!;
        public DateTimeOffset IssueDate         { get; set; }
        public decimal TotalNet                 { get; set; }
        public decimal TotalTax                 { get; set; }
        public decimal TotalGross               { get; set; } // Negative value (refund amount)
        public decimal RefundAmount             { get; set; } // Absolute value for display
    }
}
