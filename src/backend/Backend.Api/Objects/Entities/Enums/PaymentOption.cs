namespace Backend.Api.Objects.Entities.Models
{
    public enum PaymentOption
    {
        Unspecified = 0,
        Card = 1,
        Cash = 2,
        BankTransfer = 3,
        GiftCard = 4,
        Voucher = 5
    }
}