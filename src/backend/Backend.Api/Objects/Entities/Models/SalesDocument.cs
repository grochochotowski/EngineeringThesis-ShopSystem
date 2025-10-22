using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    public class SalesDocument
    {
        [Key] public int Id { get; set; }
        [Required] public SalesDocumentType DocumentType { get; set; }
        public string? Description { get; set; } // If inovice
        [Required] public DateTimeOffset IssueDate { get; set; }
        [Required, MaxLength(64)] public string DocumentNumber { get; set; } = default!;

        [Required, Precision(18, 2)] public decimal TotalNet { get; set; }
        [Required, Precision(18, 2)] public decimal TotalTax { get; set; }
        [Required, Precision(18, 2)] public decimal TotalGross { get; set; }

        public int? ClientId { get; set; } // If inovice
        public Client? Client { get; set; } // If inovice

        public ICollection<SalesDocumentItem> Items { get; set; } = new List<SalesDocumentItem>();
        public ICollection<SalesPayment> Payments { get; set; } = new List<SalesPayment>();
    }
}
