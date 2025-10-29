using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class SalesPayment
    {
        // --- Key ---
        [Key] public int Id { get; set; }

        // --- Basic fields ---
        [Precision(18, 2)] public decimal Amount    { get; set; }
        public PaymentOption PaymentOption          { get; set; }

        // --- Foreign Keys ---
        public int SalesDocumentId { get; set; }

        // --- Navigation Properties ---
        public virtual SalesDocument SalesDocument { get; set; } = default!;
    }
}