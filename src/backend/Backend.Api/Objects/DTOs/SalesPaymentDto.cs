using Backend.Api.Objects.Entities.Models;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    // --- GET PAYMENT INFO ---
    public class GetSalesPaymentDto
    {
                                                public int Id                       { get; set; }
                                                public int SalesDocumentId          { get; set; }
                                                public PaymentOption PaymentOption  { get; set; }
                                                public decimal Amount               { get; set; }
                                                public decimal? AmountTendered      { get; set; }
                                                public decimal? Change              { get; set; }
                                                public int? GiftCardId              { get; set; }
                                                public string? GiftCardCode         { get; set; } // Populated from navigation property for display
    }

    // --- CREATE PAYMENT ---
    public class CreateSalesPaymentDto
    {
        [Required]                              public PaymentOption PaymentOption  { get; set; }
        [Required, Range(0, double.MaxValue)]   public decimal Amount               { get; set; }
        [Range(0, double.MaxValue)]             public decimal? AmountTendered      { get; set; }
        [Range(0, double.MaxValue)]             public decimal? Change              { get; set; }
                                                public int? GiftCardId              { get; set; }
    }
}
