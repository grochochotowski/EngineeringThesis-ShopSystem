namespace Backend.Api.Objects.Entities.Models
{
    public class User
    {
        // --- Key ---
        public int Id { get; set; }

        // --- Basic fields ---
        public string FirstName     { get; set; } = default!;
        public string LastName      { get; set; } = default!;
        public string Email         { get; set; } = default!;
        public string PhoneNumber   { get; set; } = default!;
        public DateTime DateOfBirth { get; set; }
        public UserRole Role        { get; set; }

        // --- Foreign Keys ---
        public int AddressId { get; set; }

        // --- Navigation Properties ---
        public virtual Address Address { get; set; } = default!;
        public virtual UserCredential Credentials { get; set; } = default!;
        public virtual ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    }
}
