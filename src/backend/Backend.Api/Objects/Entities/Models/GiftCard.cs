namespace Backend.Api.Objects.Entities.Models
{
    public class GiftCard
    {
        public int Id { get; set; }
        public DateTimeOffset DateIssued { get; set; }
        public DateTimeOffset DateValidUntil { get; set; }
        public decimal Value { get; set; }
        public string Code { get; set; } = default!;
        public bool IsActive { get; set; }
    }
}
