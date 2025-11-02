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
    }

    // --- CREATE PAYMENT ---
    public class CreateSalesPaymentDto
    {
        [Required]                              public PaymentOption PaymentOption  { get; set; }
        [Required, Range(0, double.MaxValue)]   public decimal Amount               { get; set; }
    }

    // --- UPDATE PAYMENT ---
    public class UpdateSalesPaymentDto
    {
        [Required]                              public int Id                       { get; set; }
        [Required]                              public PaymentOption PaymentOption  { get; set; }
        [Required, Range(0, double.MaxValue)]   public decimal Amount               { get; set; }
    }
}
