using Backend.Api.Objects.Entities.Enums;

namespace Backend.Api.Objects.Entities.Models
{
    public class Address
    {
        // --- Key ---
        public int Id { get; set; }

        // --- Basic fields ---
        public Country Country      { get; set; }
        public string City          { get; set; } = default!;
        public string PostalCode    { get; set; } = default!;
        public string Street        { get; set; } = default!;
        public string? Building     { get; set; }
        public string? Premises     { get; set; }
    }
}
