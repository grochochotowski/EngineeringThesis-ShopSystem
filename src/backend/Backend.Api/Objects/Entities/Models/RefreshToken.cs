namespace Backend.Api.Objects.Entities.Models
{
    public class RefreshToken
    {
        // --- Key ---
        public int Id                   { get; set; }

        // --- Basic fields ---
        public int UserId               { get; set; }
        public string Token             { get; set; } = default!;
        public DateTimeOffset ExpiresAt { get; set; }
        public bool IsRevoked           { get; set; }

        // --- Navigation Properties ---
        public virtual User User        { get; set; } = default!;
    }
}
