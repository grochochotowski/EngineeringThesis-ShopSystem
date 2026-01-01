namespace Backend.Api.Objects.Entities.Models
{
    public class SalesDocument
    {
        // --- Key ---
        public int Id { get; set; }

        // --- Basic fields ---
        public SalesDocumentType DocumentType   { get; set; }
        public DateTimeOffset IssueDate         { get; set; }
        public string? Description              { get; set; } // If invoice
        public string DocumentNumber            { get; set; } = default!;
        public decimal TotalNet                 { get; set; }
        public decimal TotalTax                 { get; set; }
        public decimal TotalGross               { get; set; }

        // --- Foreign Keys ---
        public int? ClientId { get; set; } // If invoice
        public int? OriginalDocumentId { get; set; } // If return document

        // --- Navigation Properties ---
        public virtual Client? Client { get; set; } // If invoice
        public virtual SalesDocument? OriginalDocument { get; set; } // If return document

        // --- Collections (N:N, 1:N) ---
        public ICollection<SalesDocumentItem> Items { get; set; } = new List<SalesDocumentItem>();
        public ICollection<SalesPayment> Payments   { get; set; } = new List<SalesPayment>();
    }
}
