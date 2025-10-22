using Backend.Api.Objects.Entities.Models;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    public class GetSalesPaymentDto
    {
        public int Id { get; set; }
        public int SalesDocumentId { get; set; }
        public PaymentOption PaymentOption { get; set; }
        public decimal Amount { get; set; }
    }

    public class CreateSalesPaymentDto
    {
        [Required] public PaymentOption PaymentOption { get; set; }
        [Required, Range(0, double.MaxValue)] public decimal Amount { get; set; }
    }

    public class UpdateSalesPaymentDto
    {
        [Required] public int Id { get; set; }
        [Required] public PaymentOption PaymentOption { get; set; }
        [Required, Range(0, double.MaxValue)] public decimal Amount { get; set; }
    }
}
