namespace Backend.Api.Objects.Entities.Models
{
    public class SalesPayment
    {
        // --- Key ---
        public int Id { get; set; }

        // --- Basic fields ---
        public decimal Amount               { get; set; }
        public PaymentOption PaymentOption  { get; set; }

        // --- Foreign Keys ---
        public int SalesDocumentId { get; set; }

        // --- Navigation Properties ---
        public virtual SalesDocument SalesDocument { get; set; } = default!;
    }
}