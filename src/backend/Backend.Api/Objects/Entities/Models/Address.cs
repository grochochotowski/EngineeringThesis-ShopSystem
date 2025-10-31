namespace Backend.Api.Objects.Entities.Models
{
    public class Address
    {
        // --- Key ---
        public int Id { get; set; }

        // --- Basic fields ---
        public string Country       { get; set; } = default!;
        public string City          { get; set; } = default!;
        public string PostalCode    { get; set; } = default!;
        public string Street        { get; set; } = default!;
        public string Building      { get; set; } = default!;
        public string? Premises     { get; set; }
    }
}
