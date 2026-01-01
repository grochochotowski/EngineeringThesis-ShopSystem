using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Objects.DTOs
{
    // --- GET GIFT CARD INFO ---
    public class GetGiftCardDto
    {
        public int Id { get; set; }
        public DateTimeOffset DateIssued { get; set; }
        public DateTimeOffset DateValidUntil { get; set; }
        public decimal Value { get; set; }
        public string Code { get; set; } = default!;
        public bool IsActive { get; set; }
    }

    // --- GET GIFT CARD LIST ITEM ---
    public class GetGiftCardListItemDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = default!;
        public decimal Value { get; set; }
        public DateTimeOffset DateIssued { get; set; }
        public DateTimeOffset DateValidUntil { get; set; }
        public bool IsActive { get; set; }
    }

    // --- CREATE GIFT CARD (for internal use after purchase) ---
    public class CreateGiftCardDto
    {
        [Required]
        public decimal Value { get; set; }
    }

    // --- VALIDATE GIFT CARD (for payment) ---
    public class ValidateGiftCardDto
    {
        [Required, MaxLength(50)]
        public string Code { get; set; } = default!;
    }

    // --- GIFT CARD VALIDATION RESULT ---
    public class GiftCardValidationResultDto
    {
        public bool IsValid { get; set; }
        public string? ErrorMessage { get; set; }
        public int? GiftCardId { get; set; }
        public decimal? Value { get; set; }
    }

    // --- USE GIFT CARD (for payment processing) ---
    public class UseGiftCardDto
    {
        [Required]
        public int GiftCardId { get; set; }
        [Required, Range(0.01, double.MaxValue)]
        public decimal Amount { get; set; }
    }
}
