using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class SalesPayment
    {
        [Key] public int Id { get; set; }

        // Document
        [Required] public int SalesDocumentId { get; set; }
        public virtual SalesDocument SalesDocument { get; set; } = default!;

        // Other details
        [Required] public PaymentOption PaymentOption { get; set; }
        [Required, Precision(18, 2)] public decimal Amount { get; set; }
    }
}