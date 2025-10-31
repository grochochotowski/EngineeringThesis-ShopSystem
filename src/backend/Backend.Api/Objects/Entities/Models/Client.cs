namespace Backend.Api.Objects.Entities.Models
{
    public class Client
    {
        // --- Key ---
        public int Id { get; set; }

        // --- Basic fields ---
        public string Name          { get; set; } = default!;
        public string? TaxId        { get; set; }
        public ClientType Type      { get; set; }
        public string Email         { get; set; } = default!;
        public string PhoneNumber   { get; set; } = default!;

        // --- Foreign Keys ---
        public int AddressId { get; set; }

        // --- Navigation Properties ---
        public virtual Address Address { get; set; } = default!;
    }
}
