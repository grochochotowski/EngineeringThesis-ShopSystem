using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.Entities.Models
{
    [Index(nameof(DocumentNumber), IsUnique = true)]
    public class SalesDocument
    {
        // --- Key ---
        [Key] public int Id { get; set; }

        // --- Basic fields ---
        public SalesDocumentType DocumentType { get; set; }
        public DateTimeOffset IssueDate { get; set; }
        [MaxLength(256)]    public string? Description   { get; set; } // If invoice
        [MaxLength(64)]     public string DocumentNumber { get; set; } = default!;
        [Precision(18, 2)]  public decimal TotalNet      { get; set; }
        [Precision(18, 2)]  public decimal TotalTax      { get; set; }
        [Precision(18, 2)]  public decimal TotalGross    { get; set; }

        // --- Foreign Keys ---
        public int? ClientId { get; set; } // If invoice

        // --- Navigation Properties ---
        public virtual Client? Client { get; set; } // If invoice

        // --- Collections (N:N, 1:N) ---
        public ICollection<SalesDocumentItem> Items { get; set; } = new List<SalesDocumentItem>();
        public ICollection<SalesPayment> Payments { get; set; } = new List<SalesPayment>();
    }
}
