namespace Backend.Api.Objects.Entities.Models
{
    public class SalesPayment
    {
        // --- Key ---
        public int Id { get; set; }

        // --- Basic fields ---
        public decimal Amount               { get; set; }
        public PaymentOption PaymentOption  { get; set; }
        public decimal? AmountTendered      { get; set; }
        public decimal? Change              { get; set; }

        // --- Foreign Keys ---
        public int SalesDocumentId { get; set; }
        public int? GiftCardId { get; set; } // Nullable - only populated for gift card payments

        // --- Navigation Properties ---
        public virtual SalesDocument SalesDocument { get; set; } = default!;
        public virtual GiftCard? GiftCard { get; set; }
    }
}