namespace Backend.Api.Objects.Entities.Models
{
    public class TaxRate
    {
        // --- Key ---
        public int Id { get; set; }

        // --- Basic fields ---
        public string Code      { get; set; } = default!;
        public decimal Rate     { get; set; }
        public bool IsActive    { get; set; } = true;
    }
}
